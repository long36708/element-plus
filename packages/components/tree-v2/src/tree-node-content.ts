import { defineComponent, h, inject } from 'vue'
import { useNamespace } from '@element-plus/hooks'
import ElText from '@element-plus/components/text'
import { ROOT_TREE_INJECTION_KEY, treeNodeContentProps } from './virtual-tree'

/**
 * 用于渲染 Element Plus 树组件中节点的内容
 * 功能解释如下：
 * 注入依赖：通过 inject(ROOT_TREE_INJECTION_KEY) 获取上级树组件的上下文。
 * 动态渲染内容：
 * 如果用户传入了自定义插槽（tree.ctx.slots.default），则使用该插槽渲染节点内容；
 * 否则默认使用 ElText 组件显示节点标签（node.label）。
 */
export default defineComponent({
  name: 'ElTreeNodeContent',
  // 接受由父组件传递的属性
  props: treeNodeContentProps,
  setup(props) {
    // 从根树组件中获取树的上下文
    const tree = inject(ROOT_TREE_INJECTION_KEY)
    // 使用命名空间来定义样式类名
    const ns = useNamespace('tree')
    return () => {
      // 获取当前节点和其数据
      const node = props.node
      const { data } = node!

      // 如果树组件有默认插槽，则使用插槽内容渲染节点，否则使用默认的标签渲染
      return tree?.ctx.slots.default
        ? tree.ctx.slots.default({ node, data })
        : h(
            ElText,
            { tag: 'span', truncated: true, class: ns.be('node', 'label') },
            () => [node?.label]
          )
    }
  },
})
