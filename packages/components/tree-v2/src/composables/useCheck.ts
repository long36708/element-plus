import { getCurrentInstance, nextTick, ref, watch } from 'vue'
import {
  NODE_CHECK,
  NODE_CHECK_CHANGE,
  SetOperationEnum,
} from '../virtual-tree'

import type { CheckboxValueType } from '@element-plus/components/checkbox'
import type { Ref } from 'vue'
import type { Tree, TreeKey, TreeNode, TreeNodeData, TreeProps } from '../types'

export function useCheck(props: TreeProps, tree: Ref<Tree | undefined>) {
  const checkedKeys = ref<Set<TreeKey>>(new Set())
  const indeterminateKeys = ref<Set<TreeKey>>(new Set())
  const { emit } = getCurrentInstance()!

  /**
   * 使用 watch 监听 tree.value 和 props.defaultCheckedKeys 的变化，
   * 当任意一个发生变化时，会在下一次 DOM 更新后调用 _setCheckedKeys 方法设置选中节点。
   * 功能说明：
   * 监听两个响应式数据源；
   * 数据变化后延迟到 DOM 更新后执行 _setCheckedKeys；
   * immediate: true 表示初始化时立即执行一次回调。
   *
   * 为何这里要延迟到DOM更新后?
   * 📌 1. 确保树结构已经渲染完成
   * tree.value 是一个响应式引用，指向当前构建好的树结构（包含所有节点）；
   * 在组件初始化或数据更新时，tree.value 的创建和 DOM 渲染是异步的；
   * 如果在 DOM 还未更新完成时就调用 _setCheckedKeys，可能会访问到不完整或不存在的节点数据。
   * ✅ 使用 nextTick() 可以确保：
   * 所有与当前数据变更相关的 DOM 已经完成更新，此时再去操作节点数据才是安全的。
   * 🧠 2. 依赖内部状态初始化完成
   * _setCheckedKeys 方法内部会依赖 tree.value.treeNodeMap 来查找节点；
   * 而 treeNodeMap 是在 createTree 创建树结构时生成的；
   * 在 watch 回调执行时，可能 tree.value 虽已赋值，但 treeNodeMap 尚未准备好（特别是在异步处理或批量更新时）；
   * ✅ 通过 nextTick() 延迟执行，可以保证：
   * 树结构及内部映射表（如 treeNodeMap）已完成初始化，避免找不到节点的问题。
   *
   * 💡 补充建议
   * 如果自己实现类似逻辑，也应遵循这一模式：
   * 操作 DOM 或依赖组件内部状态的操作尽量放在 nextTick() 中；
   * 特别是在监听数据变化并触发 UI 相关行为时。
   */
  watch(
    [() => tree.value, () => props.defaultCheckedKeys],
    () => {
      return nextTick(() => {
        _setCheckedKeys(props.defaultCheckedKeys)
      })
    },
    {
      immediate: true,
    }
  )

  /**
   * 用于在树形结构中更新节点的半选（indeterminate）状态
   * 逻辑如下：
   * 如果未启用复选框或处于“严格模式”，直接返回。
   * 从底层向上遍历节点，判断父节点是否全选、部分选或未选。
   * 根据子节点选中状态更新当前节点的选中状态和半选状态。
   */
  const updateCheckedKeys = () => {
    // 如果树组件未初始化、未显示复选框或处于严格检查模式，则不执行任何操作
    if (!tree.value || !props.showCheckbox || props.checkStrictly) {
      return
    }
    // 获取树结构中的层级节点映射表和最大层级
    const { levelTreeNodeMap, maxLevel } = tree.value
    // 获取当前所有已选中的节点键集合
    const checkedKeySet = checkedKeys.value
    // 创建一个新的 Set 来存储处于半选状态的节点键
    const indeterminateKeySet = new Set<TreeKey>()

    // 从倒数第二层开始向上遍历，直到第一层
    // It is easier to determine the indeterminate state by
    // traversing from bottom to top
    // leaf nodes not have indeterminate status and can be skipped
    for (let level = maxLevel; level >= 1; --level) {
      const nodes = levelTreeNodeMap.get(level)
      if (!nodes) continue
      nodes.forEach((node) => {
        // 获取当前节点的子节点
        const children = node.children
        let isEffectivelyChecked =
          !node.isLeaf || node.disabled || checkedKeySet.has(node.key)
        if (children) {
          // 判断是否所有子节点都被选中
          // Whether all child nodes are selected
          let allChecked = true

          // 判断是否存在至少一个子节点被选中
          // Whether a child node is selected
          let hasChecked = false

          for (const childNode of children) {
            const key = childNode.key
            if (!childNode.isEffectivelyChecked) {
              isEffectivelyChecked = false
            }
            if (checkedKeySet.has(key)) {
              hasChecked = true
              // 如果子节点处于半选状态，则标记 allChecked 为 false，hasChecked 为 true，并跳出循环
            } else if (indeterminateKeySet.has(key)) {
              allChecked = false
              hasChecked = true
              break
            } else {
              allChecked = false
            }
          }

          // 如果所有子节点都已选中，则将当前节点加入选中集合
          if (allChecked) {
            checkedKeySet.add(node.key)
            // 如果有子节点被选中但不是全部，则将当前节点设为半选状态
          } else if (hasChecked) {
            indeterminateKeySet.add(node.key)
            checkedKeySet.delete(node.key)
            // 如果没有任何子节点被选中，则从选中集合和半选集合中移除当前节点
          } else {
            checkedKeySet.delete(node.key)
            indeterminateKeySet.delete(node.key)
          }
        }
        node.isEffectivelyChecked = isEffectivelyChecked
      })
    }
    // 将计算出的半选节点集合赋值给 indeterminateKeys
    indeterminateKeys.value = indeterminateKeySet
  }

  const isChecked = (node: TreeNode) => checkedKeys.value.has(node.key)

  const isIndeterminate = (node: TreeNode) =>
    indeterminateKeys.value.has(node.key)

  /**
   * 用于切换树形节点的选中状态，并更新其子节点的选中状态
   * 功能如下：
   * 切换当前节点：根据 isChecked 添加或移除节点的 key；
   * 级联操作子节点：若非“严格模式”，递归设置所有子节点为相同状态；
   * 立即更新状态：若 immediateUpdate 为 true，调用 updateCheckedKeys；
   * 触发回调：若 nodeClick 为 true，执行 afterNodeCheck 回调。
   * @param node 当前操作的树节点
   * @param isChecked 新的复选框状态，表示是否选中
   * @param nodeClick 是否是通过节点点击触发的，默认为true
   * @param immediateUpdate 是否立即更新选中的键集合，默认为true
   */
  const toggleCheckbox = (
    node: TreeNode,
    isChecked: CheckboxValueType,
    nodeClick = true,
    immediateUpdate = true
  ) => {
    // 获取当前选中的键集合
    const checkedKeySet = checkedKeys.value
    const children = node.children
    if (!props.checkStrictly && nodeClick && children?.length) {
      isChecked = children.some((node) => !node.isEffectivelyChecked)
    }


    // 定义一个内部函数用于递归地更新节点的选中状态
    const toggle = (node: TreeNode, checked: CheckboxValueType) => {
      // 根据新的复选框状态，添加或删除选中的键
      checkedKeySet[checked ? SetOperationEnum.ADD : SetOperationEnum.DELETE](
        node.key
      )
      // 获取当前节点的子节点
      const children = node.children

      // 如果不启用严格检查，并且当前节点有子节点，则递归更新子节点的选中状态
      if (!props.checkStrictly && children) {
        children.forEach((childNode) => {
          if (!childNode.disabled || childNode.children) {
          // 如果子节点不禁用，则更新其选中状态
          if (!childNode.disabled) {
            toggle(childNode, checked)
          }
        })
      }
    }
    // 调用内部函数更新当前节点及其子节点的选中状态
    toggle(node, isChecked)
    // 如果需要立即更新选中的键集合，则调用相应的更新函数
    if (immediateUpdate) {
      updateCheckedKeys()
    }
    // 如果是通过节点点击触发的，则调用节点选中状态改变后的回调函数
    if (nodeClick) {
      afterNodeCheck(node, isChecked)
    }
  }
  /**
   * 在节点被勾选或取消勾选后执行的回调函数
   * @param node 被勾选或取消勾选的树节点
   * @param checked 节点的勾选状态，可以是 true（勾选）或 false（未勾选）
   */
  const afterNodeCheck = (node: TreeNode, checked: CheckboxValueType) => {
    // 获取当前完全勾选的节点和它们的键值
    const { checkedNodes, checkedKeys } = getChecked()
    // 获取当前半勾选的节点和它们的键值
    const { halfCheckedNodes, halfCheckedKeys } = getHalfChecked()
    // 触发节点勾选事件，传递节点数据、完全勾选的节点和半勾选的节点信息
    emit(NODE_CHECK, node.data, {
      checkedKeys,
      checkedNodes,
      halfCheckedKeys,
      halfCheckedNodes,
    })
    // 触发节点勾选状态变化事件，传递节点数据和勾选状态
    emit(NODE_CHECK_CHANGE, node.data, checked)
  }

  // expose
  function getCheckedKeys(leafOnly = false): TreeKey[] {
    return getChecked(leafOnly).checkedKeys
  }

  function getCheckedNodes(leafOnly = false): TreeNodeData[] {
    return getChecked(leafOnly).checkedNodes
  }

  function getHalfCheckedKeys(): TreeKey[] {
    return getHalfChecked().halfCheckedKeys
  }

  function getHalfCheckedNodes(): TreeNodeData[] {
    return getHalfChecked().halfCheckedNodes
  }

  /**
   * 获取树形结构中当前选中的节点及其对应的 key，支持仅筛选叶子节点
   * 解释如下：
   * 遍历 checkedKeys，从 treeNodeMap 中获取对应的节点；
   * 如果节点存在，且满足（非叶子节点或指定只取叶子节点且该节点确实是叶子），则加入结果；
   * 返回包含 checkedKeys 和 checkedNodes 的对象。
   * @param leafOnly - 是否仅返回叶子节点中的被勾选节点，默认为false
   * @returns 返回一个对象，包含两个属性：
   *    - checkedKeys: 被勾选节点的key值数组
   *    - checkedNodes: 被勾选节点的数据数组
   */
  function getChecked(leafOnly = false): {
    checkedKeys: TreeKey[]
    checkedNodes: TreeNodeData[]
  } {
    // 初始化用于存储被勾选节点的数据数组和key值数组
    const checkedNodes: TreeNodeData[] = []
    const keys: TreeKey[] = []

    // 如果树组件存在且配置了显示复选框，则进行数据收集
    if (tree?.value && props.showCheckbox) {
      // 获取树组件中的所有节点映射
      const { treeNodeMap } = tree.value

      // 遍历所有被勾选的节点key值
      checkedKeys.value.forEach((key) => {
        // 根据key值获取对应的节点对象
        const node = treeNodeMap.get(key)
        // 如果节点存在，并且符合leafOnly的条件，则将其key值和数据添加到结果中
        if (node && (!leafOnly || (leafOnly && node.isLeaf))) {
          keys.push(key)
          checkedNodes.push(node.data)
        }
      })
    }
    // 返回收集到的被勾选节点的key值数组和数据数组
    return {
      checkedKeys: keys,
      checkedNodes,
    }
  }

  /**
   * 获取半选中的节点信息
   * 此函数用于收集当前树组件中半选中的节点的键和节点数据
   * 它的存在是因为在处理复选框树时，需要单独处理半选中状态的节点
   *
   * @returns {object} 返回一个对象，包含半选中的节点键数组和节点数据数组
   * @property {TreeKey[]} halfCheckedKeys 半选中的节点键数组
   * @property {TreeNodeData[]} halfCheckedNodes 半选中的节点数据数组
   */
  function getHalfChecked(): {
    halfCheckedKeys: TreeKey[]
    halfCheckedNodes: TreeNodeData[]
  } {
    const halfCheckedNodes: TreeNodeData[] = []
    const halfCheckedKeys: TreeKey[] = []
    if (tree?.value && props.showCheckbox) {
      const { treeNodeMap } = tree.value
      indeterminateKeys.value.forEach((key) => {
        const node = treeNodeMap.get(key)
        if (node) {
          halfCheckedKeys.push(key)
          halfCheckedNodes.push(node.data)
        }
      })
    }
    return {
      halfCheckedNodes,
      halfCheckedKeys,
    }
  }

  /**
   * 设置选中的树节点键值数组
   * 此函数用于更新树组件中选中节点的键值数组，同时清除当前的选中和半选中状态
   *
   * ✅ 1. 确保当前 DOM 和树结构已经更新完成
   * setCheckedKeys 可能被调用时，树组件（tree）的结构可能正在更新（如数据重载、展开/折叠节点等）；
   * 此时直接操作节点（如查找 treeNodeMap.get(key)）可能会失败或获取到旧的数据；
   * 使用 nextTick() 确保：
   * 所有与当前数据变更相关的 DOM 已更新完毕，树结构和内部映射（如 treeNodeMap）已准备就绪。
   *
   * ✅ 2. 避免同步操作冲突
   * Vue 的响应式系统是异步的：当你修改了响应式数据（如 props.data），DOM 并不会立即更新；
   * 如果你在此时调用 _setCheckedKeys(keys)，可能会因为节点尚未创建而找不到对应的节点；
   * 使用 nextTick() 可以确保：
   * 在所有异步更新完成后执行操作，避免因数据与 DOM 不一致导致的问题。
   * @param keys 树节点的键值数组，代表需要被选中的节点
   */
  function setCheckedKeys(keys: TreeKey[]) {
    checkedKeys.value.clear()
    indeterminateKeys.value.clear()
    // 在下一个 DOM 更新周期中设置新的选中键值数组
    nextTick(() => {
      _setCheckedKeys(keys)
    })
  }

  /**
   * 设置节点的选中状态
   * 此函数用于在用户交互或程序逻辑需要更新节点选中状态时调用
   * 它根据给定的节点键找到对应的节点，并设置其选中或未选中的状态
   *
   * @param key 节点的唯一键值，用于标识特定的节点
   * @param isChecked 节点的新选中状态，true表示选中，false表示未选中
   */
  function setChecked(key: TreeKey, isChecked: boolean) {
    // 确保树结构数据存在且显示复选框
    if (tree?.value && props.showCheckbox) {
      // 根据节点键获取对应的节点实例
      const node = tree.value.treeNodeMap.get(key)
      // 如果节点存在，则更新其选中状态
      if (node) {
        toggleCheckbox(node, isChecked, false)
      }
    }
  }

  /**
   * 用于处理复选框的批量选中逻辑
   * 具体功能如下：
   * 检查 tree.value 和 showCheckbox 是否为真，确保可以操作树节点；
   * 遍历传入的 keys 数组，从 treeNodeMap 中获取对应的节点；
   * 如果节点未被选中（!isChecked(node)），则调用 toggleCheckbox 将其设为选中；
   * 最后调用 updateCheckedKeys 更新已选中节点的 keys。
   * @param keys 要设置为选中的节点键数组
   */
  function _setCheckedKeys(keys: TreeKey[]) {
    // 确保树组件已初始化且具有值
    if (tree?.value) {
      const { treeNodeMap } = tree.value

      // 仅当显示复选框且节点映射存在且键数组不为空时执行逻辑
      if (props.showCheckbox && treeNodeMap && keys?.length > 0) {
        for (const key of keys) {
          const node = treeNodeMap.get(key)
          // 如果节点存在且未选中，则选中该节点
          if (node && !isChecked(node)) {
            toggleCheckbox(node, true, false, false)
          }
        }
        // 更新选中的节点键数组
        updateCheckedKeys()
      }
    }
  }

  return {
    updateCheckedKeys,
    toggleCheckbox,
    isChecked,
    isIndeterminate,
    // expose
    getCheckedKeys,
    getCheckedNodes,
    getHalfCheckedKeys,
    getHalfCheckedNodes,
    setChecked,
    setCheckedKeys,
  }
}
