import React, { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import KeyIcon from "@mui/icons-material/Key";
import SendIcon from "@mui/icons-material/Send";
import Stack from "@mui/material/Stack";
import { mt } from "date-fns/locale";
import { Password } from "@mui/icons-material";

const defaultTheme = createTheme();
const ResetPassword = (props) => {

  const navigate = useNavigate();
  const [inputField, setInputField]=useState({
    otpCode:"",
    password:"",
    cpassword:""
  })
 const [errField, setErrField] =useState({
    otpCodeErr:"",
    passwordErr:"",
    cpasswordErr:""

 })

 const validForm =()=>{
  let fromIsValid = true

  setErrField({
    otpCodeErr:"",
    passwordErr:"",
    cpasswordErr:""

  })
  if(inputField.otpCode ==''){
    fromIsValid =true
    setErrField(prevState=>({
      ...prevState, otpCodeErr:"Please Enter Otp"
    }))
  }
  if(inputField.password ==''){
    fromIsValid =false
    setErrField(prevState=>({
      ...prevState, passwordErr:"Please Enter Password"
    }))
  }
  if(inputField.cpassword ==''){
    fromIsValid =false
    setErrField(prevState=>({
      ...prevState, cpasswordErr:"Please Enter Conform Password"
    }))
  }
  if(inputField.cpassword !='' && inputField.password != inputField.cpassword){
    fromIsValid =false
    setErrField(prevState=>({
      ...prevState,cpasswordErr:"Password are not matched"
    }))
  }
  return fromIsValid
 }
const inpuHandler =(e)=>{
  setInputField({...inputField,[e.target.name]:e.target.value})
}


const submitButton =async ()=>{
  if(validForm()){
    Object.assign(inputField,props)
    console.log(inputField,props)
    let url ='http://localhost:3000/change-passowrd'
    let optios ={
      method: 'POST',
      url:url,
      data:inputField
    }
    try {
      let response =await axios(optios)
      if(response.data.statusText=='Success'){

        toast.success(response.data.message)
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }else{
        toast.error(response.data.error)
      }
      
      
    } catch (error) {
      toast.error("Something Went Wrong")
      
    }
  }else{
    toast.error("Form Invalid")
  }
}
 
  return (
    <>
      <ThemeProvider theme={defaultTheme}>
        <Container component="main" maxWidth="xs">
          <CssBaseline />
          <form>
          <Box
            sx={{
              marginTop: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
              <KeyIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Reset Password
            </Typography>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="OTP CODE"
                name="otpCode"
                autoComplete="otp"
                autoFocus
                value={inputField.otpCode}
                onChange={inpuHandler}

              />
              {
                errField.otpCodeErr.length>0 && <span style={{color:"red"}}>{errField.otpCodeErr}</span>
              }
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                onChange={inpuHandler}
                value={inputField.password}
              />
                {
                errField.passwordErr.length>0 && <span style={{color:"red"}}>{errField.passwordErr}</span>
              }
              <TextField
                margin="normal"
                required
                fullWidth
                name="cpassword"
                label="Confirm Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={inputField.cpassword}
                onChange={inpuHandler}
              />
              {
                errField.cpasswordErr.length>0 && <span style={{color:"red"}}>{errField.cpasswordErr}</span>
              }

              <Button
                variant="contained"
                endIcon={<SendIcon />}
                sx={{ mr: "115px", mt: 1 }}
                onClick={submitButton}

              >
                Change Password
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  navigate("/forget");
                  props.setShowForm(true); 
                }}
                sx={{ mt: 1 }}
                
                // disabled={!props.email}
              >
                Back
              </Button>
            </Box>
          </Box>
          </form>
        </Container>
      </ThemeProvider>
    </>
  );
};

export default ResetPassword;
