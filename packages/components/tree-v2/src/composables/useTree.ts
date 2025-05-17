import { computed, ref, shallowRef, watch } from 'vue'
import { isObject } from '@element-plus/utils'
import {
  CURRENT_CHANGE,
  NODE_CLICK,
  NODE_COLLAPSE,
  NODE_DROP,
  NODE_EXPAND,
  TreeOptionsEnum,
} from '../virtual-tree'
import { useCheck } from './useCheck'
import { useFilter } from './useFilter'
import type {
  FixedSizeList,
  Alignment as ScrollStrategy,
} from '@element-plus/components/virtual-list'
import type { SetupContext } from 'vue'
import type { treeEmits } from '../virtual-tree'
import type { CheckboxValueType } from '@element-plus/components/checkbox'
import type {
  Tree,
  TreeData,
  TreeKey,
  TreeNode,
  TreeNodeData,
  TreeProps,
} from '../types'

export function useTree(
  props: TreeProps,
  emit: SetupContext<typeof treeEmits>['emit']
) {
  const expandedKeySet = ref<Set<TreeKey>>(new Set(props.defaultExpandedKeys))
  const currentKey = ref<TreeKey | undefined>()
  const tree = shallowRef<Tree | undefined>()
  // 固定大小的列表的 ref
  const listRef = ref<typeof FixedSizeList | undefined>()

  const {
    isIndeterminate,
    isChecked,
    toggleCheckbox,
    getCheckedKeys,
    getCheckedNodes,
    getHalfCheckedKeys,
    getHalfCheckedNodes,
    setChecked,
    setCheckedKeys,
  } = useCheck(props, tree)

  const { doFilter, hiddenNodeKeySet, isForceHiddenExpandIcon } = useFilter(
    props,
    tree
  )

  const valueKey = computed(() => {
    return props.props?.value || TreeOptionsEnum.KEY
  })
  const childrenKey = computed(() => {
    return props.props?.children || TreeOptionsEnum.CHILDREN
  })
  const disabledKey = computed(() => {
    return props.props?.disabled || TreeOptionsEnum.DISABLED
  })
  const labelKey = computed(() => {
    return props.props?.label || TreeOptionsEnum.LABEL
  })

  /**
   * 用于将树形结构的节点展开为一维数组，仅包含未被隐藏且在展开状态下的节点。
   * 为了方便在界面上以列表的形式展示树形结构的数据
   * 功能说明：
   * 从 expandedKeySet 和 hiddenNodeKeySet 中获取当前展开和隐藏的节点 key。
   * 使用栈实现深度优先遍历树结构。
   * 若节点被隐藏（存在于 hiddenKeys），则跳过该节点。
   * 若节点已展开（存在于 expandedKeys），则将其子节点压入栈中（逆序入栈，保证顺序正确）。
   * 最终返回拍平后的可见节点数组 flattenNodes。
   */
  const flattenTree = computed(() => {
    // 获取当前展开的节点集合
    const expandedKeys = expandedKeySet.value
    // 获取当前隐藏的节点集合
    const hiddenKeys = hiddenNodeKeySet.value
    // 初始化扁平化后的节点数组
    const flattenNodes: TreeNode[] = []
    // 获取树形结构的原始数据
    const nodes = tree.value?.treeNodes || []

    // 使用栈来辅助进行深度优先遍历
    const stack: TreeNode[] = []
    // 将所有根节点添加到栈中，从后往前添加，以便从前往后弹出
    for (let i = nodes.length - 1; i >= 0; --i) {
      stack.push(nodes[i])
    }

    // 当栈不为空时，继续遍历
    while (stack.length) {
      // 弹出栈顶节点
      const node = stack.pop()!
      // 如果当前节点是隐藏的，则跳过
      if (hiddenKeys.has(node.key)) continue

      // 将当前节点添加到扁平化数组中
      flattenNodes.push(node)

      // 如果当前节点有子节点且当前节点是展开的状态，则将子节点添加到栈中，从后往前添加
      if (node.children && expandedKeys.has(node.key)) {
        for (let i = node.children.length - 1; i >= 0; --i) {
          stack.push(node.children[i])
        }
      }
    }

    // 返回扁平化后的节点数组
    return flattenNodes
  })

  const isNotEmpty = computed(() => {
    return flattenTree.value.length > 0
  })

  /**
   * 将扁平的树形结构数据（data）转换为具有层级关系的树形对象，并记录节点映射和层级信息
   * @param data 树结构的数据源
   * @returns 返回一个包含树节点映射、层级节点映射、最大层级和树节点数组的对象
   * 具体功能如下：
   * 构建树结构：通过递归遍历数据，为每个节点创建 TreeNode 对象，并设置层级、父子关系、是否为叶子节点等属性。
   * 记录节点映射：
   * treeNodeMap：以节点 key 为键，存储所有节点，便于后续查找。
   * levelTreeNodeMap：按层级分类存储节点。
   * 计算最大层级：遍历时更新 maxLevel，记录树的最大深度。
   * 返回结果对象：包含树节点数组、节点映射表、层级节点表及最大层级。
   */
  function createTree(data: TreeData): Tree {
    // 创建一个映射，用于存储每个节点的键值和对应的节点对象
    const treeNodeMap: Map<TreeKey, TreeNode> = new Map()
    // 创建一个映射，用于存储每个层级对应的节点数组
    const levelTreeNodeMap: Map<number, TreeNode[]> = new Map()
    // 初始化最大层级为1
    let maxLevel = 1

    /**
     * 遍历节点数据，构建树结构
     * @param nodes 节点数据数组
     * @param level 当前层级，默认为1
     * @param parent 父节点，默认为undefined
     * @returns 返回处理后的节点数组
     */
    function traverse(
      nodes: TreeData,
      level = 1,
      parent: TreeNode | undefined = undefined
    ) {
      // 存储当前节点的兄弟节点
      const siblings: TreeNode[] = []
      // 遍历每个原始节点
      for (const rawNode of nodes) {
        // 获取节点的键值
        const value = getKey(rawNode)
        // 创建一个新的树节点对象
        const node: TreeNode = {
          level,
          key: value,
          data: rawNode,
        }
        // 设置节点的标签
        node.label = getLabel(rawNode)
        // 设置节点的父节点
        node.parent = parent
        // 获取节点的子节点
        const children = getChildren(rawNode)
        // 设置节点是否禁用
        node.disabled = getDisabled(rawNode)
        node.isLeaf = !children || children.length === 0
        // 根据子节点情况设置是否是叶子节点
        if (children && children.length) {
          node.children = traverse(children, level + 1, node)
        }
        // 将节点添加到兄弟节点数组中
        siblings.push(node)
        // 将节点添加到节点映射中
        treeNodeMap.set(value, node)
        // 如果当前层级不存在于层级映射中，则创建一个新的数组
        if (!levelTreeNodeMap.has(level)) {
          levelTreeNodeMap.set(level, [])
        }
        // 将节点添加到对应层级的数组中
        levelTreeNodeMap.get(level)?.push(node)
      }
      // 更新最大层级
      if (level > maxLevel) {
        maxLevel = level
      }
      // 返回兄弟节点数组
      return siblings
    }

    // 调用遍历函数处理数据，构建树节点数组
    const treeNodes: TreeNode[] = traverse(data)
    // 返回包含树结构相关信息的对象
    return {
      treeNodeMap,
      levelTreeNodeMap,
      maxLevel,
      treeNodes,
    }
  }

  function filter(query: string) {
    // 执行过滤操作，返回过滤后的需要展开的节点keys集合
    const keys = doFilter(query)
    if (keys) {
      expandedKeySet.value = keys
    }
  }

  function getChildren(node: TreeNodeData): TreeNodeData[] {
    return node[childrenKey.value]
  }

  function getKey(node: TreeNodeData): TreeKey {
    if (!node) {
      return ''
    }
    return node[valueKey.value]
  }

  function getDisabled(node: TreeNodeData): boolean {
    return node[disabledKey.value]
  }

  function getLabel(node: TreeNodeData): string {
    return node[labelKey.value]
  }

  function toggleExpand(node: TreeNode) {
    const expandedKeys = expandedKeySet.value
    if (expandedKeys.has(node.key)) {
      // 若已展开，则折叠它
      collapseNode(node)
    } else {
      // 否则展开它
      expandNode(node)
    }
  }

  /**
   * 根据给定的节点键列表 keys，向上追溯每个节点的所有祖先节点，
   * 并将这些节点加入到一个表示展开节点的集合中（expandedKeySet）
   * 具体逻辑如下：
   * 创建一个空的 Set 来保存最终需要展开的节点键。
   * 遍历传入的每个节点键 k：
   * 从树结构中获取对应的节点；
   * 向上遍历其所有祖先节点，直到根节点或已添加过的节点；
   * 每个未添加过的节点键都加入 expandedKeys 集合中。
   * 最后将结果赋值给响应式数据 expandedKeySet.value。
   * @param keys
   */
  function setExpandedKeys(keys: TreeKey[]) {
    // 创建一个新的Set来存储即将展开的树节点键，避免重复和确保查找效率
    const expandedKeys = new Set<TreeKey>()
    // 获取树组件中所有节点的映射，以便快速访问
    const nodeMap = tree.value!.treeNodeMap

    // 遍历每个要展开的键
    keys.forEach((k) => {
      // 尝试从节点映射中获取当前键对应的节点
      let node = nodeMap.get(k)
      // 当节点存在且节点的键尚未被添加到展开的键集合中时，继续循环
      while (node && !expandedKeys.has(node.key)) {
        // 将当前节点的键添加到展开的键集合中
        expandedKeys.add(node.key)
        // 移动到父节点，以检查是否需要展开父节点
        node = node.parent
      }
    })

    // 更新全局的展开键集合，以反映新的展开状态
    expandedKeySet.value = expandedKeys
  }

  /**
   * 处理节点点击事件
   * 功能如下：
   * 触发点击事件：通过 emit 触发 NODE_CLICK 事件，传递节点数据和事件对象；
   * 更新当前节点：调用 handleCurrentChange 更新当前选中节点；
   * 展开/收起节点：若配置为点击展开，则调用 toggleExpand；
   * 勾选节点：若启用复选框、且满足点击勾选条件、且节点未禁用，则调用 toggleCheckbox 切换选中状态。
   * @param node 被点击的树节点
   * @param e 鼠标事件对象
   */
  function handleNodeClick(node: TreeNode, e: MouseEvent) {
    // 触发节点点击事件，传递节点数据和原始事件对象
    emit(NODE_CLICK, node.data, node, e)

    // 更新当前选中的节点
    handleCurrentChange(node)

    // 如果配置了点击节点时展开或折叠节点
    if (props.expandOnClickNode) {
      // 切换节点的展开状态
      toggleExpand(node)
    }

    // 如果显示复选框，并且配置了点击节点时切换复选状态，
    // 或者是叶子节点且配置了点击叶子节点时切换复选状态，且节点未禁用
    if (
      props.showCheckbox &&
      (props.checkOnClickNode || (node.isLeaf && props.checkOnClickLeaf)) &&
      !node.disabled
    ) {
      // 切换节点的复选状态
      toggleCheckbox(node, !isChecked(node), true)
    }
  }

  function handleNodeDrop(node: TreeNode, e: DragEvent) {
    emit(NODE_DROP, node.data, node, e)
  }

  function handleCurrentChange(node: TreeNode) {
    if (!isCurrent(node)) {
      currentKey.value = node.key
      emit(CURRENT_CHANGE, node.data, node)
    }
  }

  function handleNodeCheck(node: TreeNode, checked: CheckboxValueType) {
    toggleCheckbox(node, checked)
  }

  /**
   * 展开指定的树节点
   * @param node 需要展开的节点，类型为 TreeNode
   *
   * 该函数用于处理树节点展开时的逻辑，主要包括：
   * - 如果启用了 `accordion`（手风琴）模式，则同一层级只能展开一个节点；
   * - 将当前节点添加到已展开节点的 key 集合中；
   * - 触发 `NODE_EXPAND` 事件通知外部节点已展开。
   */
  function expandNode(node: TreeNode) {
    const keySet = expandedKeySet.value
    // 判断是否启用 accordion 模式：同一层级只能有一个节点展开
    if (tree.value && props.accordion) {
      // whether only one node among the same level can be expanded at one time
      const { treeNodeMap } = tree.value
      // 遍历当前所有已展开节点的 key
      keySet.forEach((key) => {
        const treeNode = treeNodeMap.get(key)
        // 如果发现同层级已有其他节点被展开，则将其从展开集合中移除
        if (node && node.level === treeNode?.level) {
          keySet.delete(key)
        }
      })
    }
    // 将当前节点加入已展开节点集合
    keySet.add(node.key)
    // 触发 NODE_EXPAND 事件，传递节点数据和节点对象
    emit(NODE_EXPAND, node.data, node)
  }

  /**
   * 折叠树节点
   * @param node
   */
  function collapseNode(node: TreeNode) {
    expandedKeySet.value.delete(node.key)
    emit(NODE_COLLAPSE, node.data, node)
  }

  function isExpanded(node: TreeNode): boolean {
    return expandedKeySet.value.has(node.key)
  }

  /**
   * 判断节点是否禁用
   * @param node
   */
  function isDisabled(node: TreeNode): boolean {
    // !!node.disabled 将 node.disabled 转换为布尔值，确保返回值为 true 或 false
    return !!node.disabled
  }

  function isCurrent(node: TreeNode): boolean {
    const current = currentKey.value
    return current !== undefined && current === node.key
  }

  /**
   * 获取当前选中的节点数据
   */
  function getCurrentNode(): TreeNodeData | undefined {
    if (!currentKey.value) return undefined
    return tree.value?.treeNodeMap.get(currentKey.value)?.data
  }

  function getCurrentKey(): TreeKey | undefined {
    return currentKey.value
  }

  function setCurrentKey(key: TreeKey): void {
    currentKey.value = key
  }

  /**
   * 设置树形数据
   *
   * 该函数接受一个树形数据对象作为参数，并使用这些数据创建一个新的树形结构，
   * 然后将这个新的树形结构赋值给全局变量tree，以更新界面上显示的树形结构
   *
   * @param data - 树形数据对象，用于构建新的树形结构
   */
  function setData(data: TreeData) {
    tree.value = createTree(data)
  }

  function getNode(data: TreeKey | TreeNodeData) {
    const key = isObject(data) ? getKey(data) : data
    return tree.value?.treeNodeMap.get(key)
  }

  function scrollToNode(key: TreeKey, strategy: ScrollStrategy = 'auto') {
    const node = getNode(key)
    if (node && listRef.value) {
      listRef.value.scrollToItem(flattenTree.value.indexOf(node), strategy)
    }
  }

  function scrollTo(offset: number) {
    listRef.value?.scrollTo(offset)
  }

  watch(
    () => props.currentNodeKey,
    (key) => {
      currentKey.value = key
    },
    {
      immediate: true,
    }
  )

  watch(
    () => props.data,
    (data: TreeData) => {
      setData(data)
    },
    {
      immediate: true,
    }
  )

  return {
    tree,
    flattenTree,
    isNotEmpty,
    listRef,
    getKey,
    getChildren,
    toggleExpand,
    toggleCheckbox,
    isExpanded,
    isChecked,
    isIndeterminate,
    isDisabled,
    isCurrent,
    isForceHiddenExpandIcon,
    handleNodeClick,
    handleNodeDrop,
    handleNodeCheck,
    // expose
    getCurrentNode,
    getCurrentKey,
    setCurrentKey,
    getCheckedKeys,
    getCheckedNodes,
    getHalfCheckedKeys,
    getHalfCheckedNodes,
    setChecked,
    setCheckedKeys,
    filter,
    setData,
    getNode,
    expandNode,
    collapseNode,
    setExpandedKeys,
    scrollToNode,
    scrollTo,
  }
}
