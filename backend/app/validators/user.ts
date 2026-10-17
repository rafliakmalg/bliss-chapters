import vine from '@vinejs/vine'

export const loginValidator = vine.create({
  passcode: vine.string().trim().maxLength(64),
})

export const loginHintValidator = vine.create({
  level: vine.number().withoutDecimals().min(1).optional(),
})
