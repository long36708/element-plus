import { computed, inject } from 'vue'
import { useFormDisabled } from '@element-plus/components/form'
import { isUndefined } from '@element-plus/utils'
import { checkboxGroupContextKey } from '../constants'

import type { CheckboxModel, CheckboxStatus } from '../composables'

/**
 * 自定义钩子，用于确定复选框是否应禁用
 * 此钩子主要根据复选框分组的限制条件来计算单个复选框是否应该被禁用
 *
 * @param model - 复选框模型，包含复选框组的状态信息
 * @param isChecked - 表示当前复选框是否被选中
 * @returns 返回包含禁用状态和限制条件禁用状态的对象
 */
export const useCheckboxDisabled = ({
  model,
  isChecked,
}: Pick<CheckboxModel, 'model'> & Pick<CheckboxStatus, 'isChecked'>) => {
  // 尝试获取复选框分组上下文，如果不存在则默认为undefined
  const checkboxGroup = inject(checkboxGroupContextKey, undefined)

  // 计算是否因为达到最大/最小选择限制而禁用复选框
  const isLimitDisabled = computed(() => {
    const max = checkboxGroup?.max?.value
    const min = checkboxGroup?.min?.value
    // 当设置了最大选择数，且已选中的复选框数量达到或超过最大值，且当前复选框未被选中时，禁用当前复选框
    // 或者，当设置了最小选择数，且已选中的复选框数量达到或低于最小值，且当前复选框已被选中时，禁用当前复选框
    return (
      (!isUndefined(max) && model.value.length >= max && !isChecked.value) ||
      (!isUndefined(min) && model.value.length <= min && isChecked.value)
    )
  })

  // 根据复选框分组的禁用状态或限制条件禁用状态，计算最终的禁用状态
  const isDisabled = useFormDisabled(
    computed(() => checkboxGroup?.disabled.value || isLimitDisabled.value)
  )

  // 返回计算出的禁用状态和限制条件禁用状态
  return {
    isDisabled,
    isLimitDisabled,
  }
}

export type CheckboxDisabled = ReturnType<typeof useCheckboxDisabled>
