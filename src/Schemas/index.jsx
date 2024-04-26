import * as Yup from "yup";

export const addNetwork = Yup.object({
  flight: Yup.string()
    .matches(/^\s*\S.{6}\S\s*$/, "Flight must be 8 characters long")
    .min(8)
    .max(8)
    .required("Please enter Flight"),
  depStn: Yup.string().min(4).max(4).required("Please enter Dep Stn"),
  std: Yup.string().required("Field is required"),
  bt: Yup.string().required("Field is required"),
  sta: Yup.string().required("Field is required"),
  arrStn: Yup.string().min(4).max(4).required("Please enter Arr Stn"),
  variant: Yup.string()
    .matches(
      /^[a-zA-Z0-9 -]{8}$/,
      'Must be 8 characters and can only contain letters, numbers, "-", and blank spaces'
    )
    .required("Field is required"),
  effFromDt: Yup.date().required("Field is required"),
  effToDt: Yup.date().required("Field is required"),
  dow: Yup.string()
    .matches(
      /^[1-7]{7}$/,
      "Must be 7 digits and each digit can only be between 1 and 7"
    )
    .required("Field is required"),
  domINTL: Yup.string().required("Field is required"),
  userTag1: Yup.string().max(12, "Maximum length is 12").nullable(),
  userTag2: Yup.string().max(12, "Maximum length is 12").nullable(),
  remarks1: Yup.string().max(12, "Maximum length is 12").nullable(),
  remarks2: Yup.string().max(12, "Maximum length is 12").nullable(),
});

export const addSectore = Yup.object({
  sector1: Yup.string().min(4).max(4).required("Please enter Dep Stn"),
  sector2: Yup.string().min(4).max(4).required("Please enter Arr Stn"),
  acftType: Yup.string().matches(
    /^[a-zA-Z0-9 -]{8}$/,
    'Must be 8 characters and can only contain letters, numbers, "-", and blank spaces'
  ),
  variant: Yup.string().matches(
    /^[a-zA-Z0-9 -]{8}$/,
    'Must be 8 characters and can only contain letters, numbers, "-", and blank spaces'
  ),
  bt: Yup.string().required("Field is required"),
  
  paxCapacity: Yup.number("Pax count must be an integer")
    .min(0, "Minimum pax count is 0")
    .max(600, "Maximum pax count is 600")
    .required("Field is required"),

  CargoCapT : Yup.number()
  .typeError('CargoCapT must be a number')
  .required('CargoCapT is required')
  .min(0, 'CargoCapT must be greater than or equal to 0')
  .max(150, 'CargoCapT must be less than or equal to 150')
  .positive('CargoCapT must be a positive number')
  .integer('CargoCapT must be an integer or have one decimal point')
  .test('decimal-point', 'CargoCapT must have one decimal point', value => {
    if (!Number.isFinite(value)) {
      return true; // Pass if the value is not a finite number (e.g., undefined, null, NaN)
    }
    const decimalCount = (value.toString().split('.')[1] || []).length;
    return decimalCount === 1;
  }),

  paxLF:Yup.number()
  .typeError('paxLF must be a number')
  .integer('paxLF must be an integer')
  .required('paxLF is required')
  .min(0, 'paxLF must be greater than or equal to 0')
  .max(100, 'paxLF must be less than or equal to 100'),

  cargoLF:Yup.number()
  .typeError('cargoLF must be a number')
  .integer('cargoLF must be an integer')
  .required('cargoLF is required')
  .min(0, 'cargoLF must be greater than or equal to 0')
  .max(100, 'cargoLF must be less than or equal to 100'),

  fromDt:Yup.date().required("This is required"),
  toDt:Yup.date().required("This is required"),
});
