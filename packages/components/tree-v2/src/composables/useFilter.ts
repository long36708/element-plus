import { computed, ref } from 'vue'
import { isFunction } from '@element-plus/utils'
import type { Ref } from 'vue'
import type { Tree, TreeKey, TreeNode, TreeProps } from '../types'

// When the data volume is very large using filter will cause lag
// I haven't found a better way to optimize it for now
// Maybe this problem should be left to the server side
/**
 * 当数据量非常大时，使用过滤器会导致延迟，我还没有找到一个更好的方法来优化它，也许这个问题应该留给服务器端
 * @param props
 * @param tree
 */
export function useFilter(props: TreeProps, tree: Ref<Tree | undefined>) {
  const hiddenNodeKeySet = ref<Set<TreeKey>>(new Set([]))
  const hiddenExpandIconKeySet = ref<Set<TreeKey>>(new Set([]))

  const filterable = computed(() => {
    return isFunction(props.filterMethod)
  })

  /**
   * 根据查询条件对树形结构数据进行过滤，并动态控制节点的展开与隐藏状态
   * 具体逻辑如下：
   * 若组件不可过滤（filterable.value === false），直接返回。
   * 初始化用于记录需要展开的节点键集合 expandKeySet、隐藏展开图标集合 hiddenExpandIconKeys 和隐藏节点集合 hiddenKeys。
   * 遍历树节点，使用 filterMethod 判断节点是否匹配查询条件：
   * 匹配则将其家族路径上的所有节点加入 expandKeySet。
   * 不匹配且为叶子节点，则将其加入隐藏集合。
   * 对于非叶子节点，若不在展开集合中，则加入隐藏集合。
   * 如果某非叶子节点的所有子节点都被隐藏，则隐藏其展开图标。
   * 最后返回应展开的节点键集合 expandKeySet。
   * @param query 查询关键字
   * @returns 需展开的节点 key 集合
   */
  function doFilter(query: string) {
    // 如果未定义过滤方法，直接返回
    if (!filterable.value) {
      return
    }
    // 创建一个集合来存储需要展开的节点 key
    const expandKeySet = new Set<TreeKey>()
    // 获取当前隐藏展开图标节点的 key 集合
    const hiddenExpandIconKeys = hiddenExpandIconKeySet.value
    // 获取当前隐藏节点的 key 集合
    const hiddenKeys = hiddenNodeKeySet.value
    // 定义一个数组记录当前遍历路径上的家族节点
    const family: TreeNode[] = []
    // 获取当前树的根节点数组
    const nodes = tree.value?.treeNodes || []
    // 获取用户自定义的过滤方法
    const filter = props.filterMethod
    // 清空之前的隐藏节点集合
    hiddenKeys.clear()

    /**
     * 深度优先递归遍历树节点
     * @param nodes 待遍历的节点数组
     */
    function traverse(nodes: TreeNode[]) {
      nodes.forEach((node) => {
        // 将当前节点加入家族数组（用于记录祖先路径）
        family.push(node)

        // 如果当前节点匹配过滤条件，则将该节点及其所有祖先节点加入展开集合
        if (filter?.(query, node.data, node)) {
          family.forEach((member) => {
            expandKeySet.add(member.key)
          })
        } else if (node.isLeaf) {
          // 如果是叶子节点且不匹配，则加入隐藏集合
          hiddenKeys.add(node.key)
        }

        // 获取当前节点的子节点
        const children = node.children
        if (children) {
          // 递归处理子节点
          traverse(children)
        }

        // 对于非叶子节点的额外处理
        if (!node.isLeaf) {
          // 如果当前节点不在展开集合中，则加入隐藏集合
          if (!expandKeySet.has(node.key)) {
            hiddenKeys.add(node.key)
          } else if (children) {
            // 如果当前节点有子节点，并且所有子节点都被隐藏，则也隐藏其展开图标
            // If all child nodes are hidden, then the expand icon will be hidden
            let allHidden = true
            for (const childNode of children) {
              if (!hiddenKeys.has(childNode.key)) {
                allHidden = false
                break
              }
            }
            if (allHidden) {
              hiddenExpandIconKeys.add(node.key)
            } else {
              // 否则确保展开图标不被隐藏
              hiddenExpandIconKeys.delete(node.key)
            }
          }
        }
        // 当前节点遍历完成，从家族数组中移除
        family.pop()
      })
    }

    // 开始遍历根节点
    traverse(nodes)
    // 返回本次过滤后应展开的节点 key 集合
    return expandKeySet
  }

  /**
   * 判断某个树节点 node 是否应该强制隐藏其展开图标
   * @param node
   */
  function isForceHiddenExpandIcon(node: TreeNode): boolean {
    return hiddenExpandIconKeySet.value.has(node.key)
  }

  return {
    hiddenExpandIconKeySet,
    hiddenNodeKeySet,
    doFilter,
    isForceHiddenExpandIcon,
  }
}
