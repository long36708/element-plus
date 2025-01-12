import type { ShallowRef } from 'vue'

interface SelectionInfo {
  selectionStart?: number
  selectionEnd?: number
  value?: string
  beforeTxt?: string
  afterTxt?: string
}

// Keep input cursor in the correct position when we use formatter.
/**
 * 自定义钩子，用于记录和设置输入框的光标位置
 * @param input 一个包含输入框的 ShallowRef
 * @returns 返回两个函数：recordCursor（记录光标位置）和 setCursor（设置光标位置）
 */
export function useCursor(
  input: ShallowRef<HTMLInputElement | undefined>
): [() => void, () => void] {
  // 存储光标位置和输入框内容的变量
  let selectionInfo: SelectionInfo

  /**
   * 记录当前输入框的光标位置和内容
   */
  function recordCursor() {
    // 如果输入框未定义，则不执行任何操作
    if (input.value == undefined) return

    // 获取输入框的选中区域和内容
    const { selectionStart, selectionEnd, value } = input.value

    // 如果选中区域未定义，则不执行任何操作
    if (selectionStart == null || selectionEnd == null) return

    // 获取选中区域前后的文本
    const beforeTxt = value.slice(0, Math.max(0, selectionStart))
    const afterTxt = value.slice(Math.max(0, selectionEnd))

    // 存储光标位置和内容信息
    selectionInfo = {
      selectionStart,
      selectionEnd,
      value,
      beforeTxt,
      afterTxt,
    }
  }

  /**
   * 设置输入框的光标位置
   */
  function setCursor() {
    // 如果输入框或光标信息未定义，则不执行任何操作
    if (input.value == undefined || selectionInfo == undefined) return

    // 获取输入框的内容
    const { value } = input.value
    // 解构光标信息
    const { beforeTxt, afterTxt, selectionStart } = selectionInfo

    // 如果光标信息不完整，则不执行任何操作
    if (
      beforeTxt == undefined ||
      afterTxt == undefined ||
      selectionStart == undefined
    )
      return

    // 初始化光标起始位置为输入框内容的末尾
    let startPos = value.length

    // 根据光标信息和输入框内容，计算光标的新位置
    if (value.endsWith(afterTxt)) {
      startPos = value.length - afterTxt.length
    } else if (value.startsWith(beforeTxt)) {
      startPos = beforeTxt.length
    } else {
      // 获取选中区域前一个字符
      const beforeLastChar = beforeTxt[selectionStart - 1]
      // 在输入框内容中查找该字符的新位置
      const newIndex = value.indexOf(beforeLastChar, selectionStart - 1)
      // 如果找到新位置，则更新光标起始位置
      if (newIndex !== -1) {
        startPos = newIndex + 1
      }
    }

    // 设置输入框的选中区域
    input.value.setSelectionRange(startPos, startPos)
  }

  // 返回记录和设置光标位置的函数
  return [recordCursor, setCursor]
}
