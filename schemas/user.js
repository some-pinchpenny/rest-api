const Joi = require("joi");

const registerSchema = Joi.object().keys({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const subscriptionSchema = Joi.object({
  subscription: Joi.string().valid("starter", "pro", "business").required(),
});

const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});

const schema = {
  registerSchema,
  subscriptionSchema,
  emailSchema,
};

module.exports = schema;
