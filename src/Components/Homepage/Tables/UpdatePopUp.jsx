import React, { useState, useEffect } from "react";
import {
  Stack,
  Typography,
  TextField,
  Button,
  Dialog,
  IconButton,
} from "@mui/material";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CloseIcon from "@mui/icons-material/Close";
import moment from "moment";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateField } from "@mui/x-date-pickers/DateField";
import LoadingButton from "@mui/lab/LoadingButton";


const UpdatePopUp = (props) => {
  const [openUpdate, setOpenUpdate] = useState(false);
  const [product, setProduct] = useState("");

  const [flight, setFlight] = useState("");
  const [depStn, setDepStn] = useState("");
  const [std, setStd] = useState("");
  const [bt, setBt] = useState("");
  const [sta, setSta] = useState("");
  const [arrStn, setArrStn] = useState("");
  const [variant, setVariant] = useState("");
  const [effFromDt, setEffFromDt] = useState("");
  const [effToDt, setEffToDt] = useState("");
  const [dow, setDow] = useState("");
  const [domINTL, setDomIntl] = useState("");
  const [userTag1, setUserTag1] = useState("");
  const [userTag2, setUserTag2] = useState("");
  const [remarks1, setRemarks1] = useState("");
  const [remarks2, setRemarks2] = useState("");
  const [message, setMessage] = useState("");
  const [flightError, setFlightError] = useState("");
  const [depStnError, setDepStnError] = useState("");
  const [arrStnError, seArrStnError] = useState("");
  const [variantError, setVariantError] = useState("");
  const [dowError, setDowError] = useState("");
  const [effToDtError, setEffToDtError] = useState("");
  const [effFromDtError, setEffFromDtError] = useState("");
  const [loading, setLoading] = useState(false);

  const [userTag1Error, setUserTag1Error] = useState("");
  const [userTag2Error, setUserTag2Error] = useState("");
  const [remarks1Error, setRemarks1Error] = useState("");
  const [remarks2Error, setRemarks2Error] = useState("");


  const DataId = props.checkedRows[0];
  const handleUpdateOpen = () => {
    setOpenUpdate(true);
    // setAddbutton(null);
    setFlightError(null);
    setDepStnError(null);
    seArrStnError(null);
    setVariantError(null);
    setDowError(null);
    setEffToDtError(null);
    // setEffToDt(null);
    setEffFromDtError(null);
    // setEffFromDt(null)
    setUserTag1Error(null)
    setUserTag2Error(null);
    setRemarks1Error(null);
    setRemarks2Error(null);
  };

  const handleFlight = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,8}$/.test(value)) {
      setFlight(value);
      setFlightError("");
    } else {
      setFlightError("Flight must be 8 characters long");
    }
  };

  const handleDepStn = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) {
      setDepStn(value);
      setDepStnError("");
    } else {
      setDepStnError("Arr Stn must be 4 characters long");
    }
  };

  const handleSTD = (event) => {
    setStd(event.target.value);
  };
  const handleBT = (event) => {
    setBt(event.target.value);
  };
  const handleSTA = (event) => {
    setSta(event.target.value);
  };

  const handleArrStn = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s]{0,4}$/.test(value)) {
      setArrStn(value);
      seArrStnError("");
    } else {
      seArrStnError("Det Stn must be 4 characters long");
    }
  };

  const handleVariant = (event) => {
    const value = event.target.value;
    if (/^[a-zA-Z0-9\s-]{0,8}$/.test(value)) {
      setVariant(value);
      setVariantError("");
    } else {
      setVariantError(
        'Must be 8 characters and can only contain letters, numbers, "-", and blank spaces'
      );
    }
  };
  const handleEffFromDt = (event) => {
    setEffFromDt(event.target.value);
  };
  const handleDow = (event) => {
    const value = event.target.value;
    if (/^[1-7]{0,7}$/.test(value)) {
      setDow(value);
      setDowError("");
    } else {
      setDowError(
        "Must be 7 digits and each digit can only be between 1 and 7."
      );
    }
  };
  const handleDomIntl = (event) => {
    setDomIntl(event.target.value.toLowerCase());
  };
  const handleUserTag1 = (event) => {
    const input = event.target.value;
    const isValid = /^\s*.{0,12}\s*$/.test(input);
    if (isValid) {
      setUserTag1(input);
      setUserTag1Error("");
    } else {
      setUserTag1Error("Must be 12 characters and can only contain letters");
    }
  };
  const handleUserTag2 = (event) => {
    const input = event.target.value;
    const isValid = /^\s*.{0,12}\s*$/.test(input);
    if (isValid) {
      setUserTag2(input);
      setUserTag2Error("");
    } else {
      setUserTag2Error("Must be 12 characters and can only contain letters");
    }
  };
  const handleRemarks1 = (event) => {
    const isValid = /^\s*.{0,12}\s*$/.test(event.target.value);
    if (isValid) {
      setRemarks1(event.target.value);
      setRemarks1Error("");
    } else {
      setRemarks1Error("Must be 12 characters and can only contain letters");
    }
  };
  const handleRemarks2 = (event) => {
    const isValid = /^\s*.{0,12}\s*$/.test(event.target.value);
    if (isValid) {
      setRemarks2(event.target.value);
      setRemarks2Error("");
    } else {
      setRemarks2Error("Must be 12 characters and can only contain letters");
    }
  };
  useEffect(() => {
    if (!effToDt && !props.checkedRows.length > 1) {
      setEffToDtError("This field is required.");
    } else {
      setEffToDtError("");
    }
  }, [effToDt]);

  useEffect(() => {
    if (!effFromDt && !props.checkedRows.length > 1) {
      setEffFromDtError("This field is required.");
    } else {
      setEffFromDtError("");
    }
  }, [effFromDt]);

  const productId = props.checkedRows;

  const fetchData = async () => {
    if (props.checkedRows.length > 1) {
      return
    }
    try {
      const response = await axios.get(
        `http://localhost:3000/products/${DataId}`
      );
      const item = response.data;

      const inputDate = item.effFromDt;
      const formattedDate = moment(inputDate).format("DD/MMM/YY");

      const inputEfftodate = item.effToDt;
      const formtEfftoDate = moment(inputEfftodate).format("DD/MMM/YY");

      setFlight(item.flight);
      setDepStn(item.depStn);
      setStd(item.std);
      setBt(item.bt);
      setSta(item.sta);
      setArrStn(item.arrStn);
      setVariant(item.variant);
      setEffFromDt(formattedDate);
      setEffToDt(formtEfftoDate);
      setDow(item.dow);
      setDomIntl(item.domINTL.toLowerCase());
      setUserTag1(item.userTag1);
      setUserTag2(item.userTag2);
      setRemarks1(item.remarks1);
      setRemarks2(item.remarks2);
    } catch (error) {
      console.error(error);
      setProduct(null);
    }
  };

  function isValidProductData(productData) {
    // Iterate through the values of the object
    for (const key in productData) {
      // Check if the value is not an empty string, null, or undefined
      if (productData.hasOwnProperty(key) && (productData[key] !== '' && productData[key] !== null && productData[key] !== undefined)) {
        return true; // At least one field is valid
      }
    }
    return false; // None of the fields are valid
  }

  function removeEmptyFields(productData) {
    // Iterate through the keys of the object
    for (const key in productData) {
      // Check if the value is an empty string, null, or undefined
      if (productData.hasOwnProperty(key) && (productData[key] === '' || productData[key] === null || productData[key] === undefined)) {
        // Remove the field with empty value
        delete productData[key];
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!effFromDt && !props.checkedRows.length > 1) {
      setEffFromDtError(" This field is required.");
      return;
    }
    if (!effToDt && !props.checkedRows.length > 1) {
      setEffToDtError(" This field is required.");
      return;
    }

    if (
      flightError ||
      depStnError ||
      arrStnError ||
      variantError ||
      dowError ||
      userTag1Error ||
      userTag2Error ||
      remarks1Error ||
      remarks2Error ||
      false
    ) {
      return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const productData = {
      flight,
      depStn,
      std,
      bt,
      sta,
      arrStn,
      variant,
      effFromDt,
      effToDt,
      dow,
      domINTL,
      userTag1,
      userTag2,
      remarks1,
      remarks2,
      timeZone
    };

    removeEmptyFields(productData);

    if (isValidProductData(productData)) {
      console.log('At least one field is not empty, null, or undefined.');
    } else {
      toast.error("All fields are empty");
      return 
    }

    if (productId) {
      setLoading(true);
      axios
        .put(`http://localhost:3000/update-data/${productId}`, productData, {
          headers: 
          { 'x-access-token': `${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' },
        })
        .then((response) => {
          // props.createConnections();
          const data = response.data;
          setLoading(false);
          toast.success("Updated successfully");
          setMessage(data.message);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          // props.onUpdate();
        })
        .catch((error) => {
          console.error(error);
          if (
            error.response &&
            error.response.status === 400 &&
            error.response.data.message ===
              "Data with this combination already exists"
          ) {
            toast.error("Data with this combination already exists");
          setLoading(false);

          } else {
            toast.error("An error occurred");
          setLoading(false);

          }
        });
    }
  };

  console.log(effFromDt, "this is change");
  return (
    <>
      <Button
        variant="contained"
        startIcon={<DriveFileRenameOutlineIcon />}
        onClick={() => {
          handleUpdateOpen();
          fetchData();
        }}
        sx={{ textTransform: "capitalize", width: "fit-content" }}
      >
        Update
      </Button>
      <Dialog
        open={openUpdate}
        onClose={() => {
          setOpenUpdate(false);
        }}
        fullWidth={true}
        maxWidth={"xl"}
      >
        <Stack sx={{ padding: "2%", width: "fit-content" }}>
          <Stack
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ borderBottom: "1px solid #D8D8D8" }}
          >
            <Typography sx={{ fontWeight: "bold" }}>Update Row</Typography>
            <IconButton
              sx={{ mb: "10px" }}
              onClick={() => {
                setOpenUpdate(false);
                setLoading(false);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          <form onSubmit={handleSubmit}>
            <Stack direction="row" spacing={2}>
              <Stack alignItems="center" spacing={2} sx={{width: '100%'}} style={{ marginTop: '10px' }}>                
                <Typography sx={{ width: "100px", fontSize: "14px", fontWeight: "500" }}>  
                  Flight
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={flight}
                    onChange={handleFlight}
                  />
                  {flightError && (
                    <div style={{ color: "red" }}>{flightError}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  Dep Stn
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={depStn}
                    required = {props.checkedRows.length>1 ? false : true}
                    onChange={handleDepStn}
                  />
                  {depStnError && (
                    <div style={{ color: "red" }}>{depStnError}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  STD(LT)
                </Typography>
                <TextField
                  sx={{ width: "88%" }}
                  required = {props.checkedRows.length>1 ? false : true}
                  size="small"
                  type="time"
                  value={std}
                  onChange={handleSTD}
                />
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  BT
                </Typography>
                <TextField
                  sx={{ width: "88%" }}
                  required = {props.checkedRows.length>1 ? false : true}
                  size="small"
                  type="time"
                  value={bt}
                  onChange={handleBT}
                />
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  STA(LT)
                </Typography>
                <TextField
                  sx={{ width: "88%" }}
                  size="small"
                  value={sta}
                  type="time"
                  onChange={handleSTA}
                />
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  Arr Stn
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={arrStn}
                    onChange={handleArrStn}
                  />
                  {arrStnError && (
                    <div style={{ color: "red" }}>{arrStnError}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  Variant
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={variant}
                    required = {props.checkedRows.length>1 ? false : true}
                    onChange={handleVariant}
                  />
                  {variantError && (
                    <div style={{ color: "red" }}>{variantError}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "50%", fontSize: "14px", fontWeight: "500" }}
                >
                  Eff from Dt
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      sx={{ width: 150 }}
                      format="DD/MMM/YY"
                      defaultValue={dayjs(effFromDt)}
                      value={dayjs(effFromDt)}
                      onChange={(date) => setEffFromDt(date)}
                      slotProps={{ field: { shouldRespectLeadingZeros: true } }}
                    />
                  </LocalizationProvider>
                  {effFromDtError && (
                    <div style={{ color: "red" }}>{effFromDtError}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "50%", fontSize: "14px", fontWeight: "500" }}
                >
                  Eff to Dt
                </Typography>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      sx={{ width: 150 }}
                      format="DD/MMM/YY"
                      defaultValue={dayjs(effToDt)}
                      value={dayjs(effToDt)}
                      onChange={(date) => setEffToDt(date)}
                      size="small" 
                      slotProps={{ field: { shouldRespectLeadingZeros: true } }}
                    />
                  </LocalizationProvider>
                  {effToDtError && (
                    <div style={{ color: "red" }}>{effToDtError}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  DoW
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    required = {props.checkedRows.length>1 ? false : true}
                    value={dow}
                    type="number"
                    onChange={handleDow}
                  />
                  {dowError && <div style={{ color: "red" }}>{dowError}</div>}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  Dom / INTL
                </Typography>
                <TextField
                  size="small"
                  required = {props.checkedRows.length>1 ? false : true}
                  value={domINTL}
                  onChange={handleDomIntl}
                />
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  User Tag 1
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={userTag1}
                    onChange={handleUserTag1}
                  />
                  {userTag1Error && (
                    <div style={{ color: "red" }}>{userTag1Error}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  User Tag 2
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={userTag2}
                    onChange={handleUserTag2}
                  />
                  {userTag2Error && (
                    <div style={{ color: "red" }}>{userTag2Error}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  Remarks 1
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={remarks1}
                    onChange={handleRemarks1}
                  />
                  {remarks1Error && (
                    <div style={{ color: "red" }}>{remarks1Error}</div>
                  )}
                </div>
              </Stack>
              <Stack
                alignItems="center"
                spacing={2} 
                sx={{width: '100%'}} 
                style={{ marginTop: '10px' }}
              >
                <Typography
                  sx={{ textAlign: 'center', width: "100px", fontSize: "14px", fontWeight: "500" }}
                >
                  Remarks 2
                </Typography>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TextField
                    size="small"
                    value={remarks2}
                    onChange={handleRemarks2}
                  />
                  {remarks2Error && (
                    <div style={{ color: "red" }}>{remarks2Error}</div>
                  )}
                </div>
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="end" mt="10px">
              <LoadingButton
               type="submit"
                  loading={loading}
                  variant="contained"
                >
                  <span>Submit</span>
                </LoadingButton>
            </Stack>
          </form>
        </Stack>
      </Dialog>
      <ToastContainer />
    </>
  );
};

export default UpdatePopUp;
