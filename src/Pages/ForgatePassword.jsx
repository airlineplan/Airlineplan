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
import LoadingButton from "@mui/lab/LoadingButton";
import ResetPassword from "./ResetPassword";

const defaultTheme = createTheme();

const ForgatePassword = () => {
  const [showForm, setShowForm] = useState(true);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async () => {
    try {
      setLoading(true);
      let url = "https://airlineplan.com/send-email";
      let options = {
        method: "POST",
        url: url,
        data: { email: email },
      };
      let response = await axios(options);
      let record = response.data;
      if (record.statusText === "Success") {
        toast.success(record.message);
        setLoading(false);


        setTimeout(() => {
          setShowForm(false);
        }, 2000);
      } else {
        setLoading(false);

        toast.error(record.message);

      }
    } catch (error) {
      toast.error("Something Went Wrong!");
      setLoading(false);

    }
  };

  return (
    <>
      {showForm ? (
        <ThemeProvider theme={defaultTheme}>
          <Container component="main" maxWidth="xs">
            <CssBaseline />
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
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
                <LoadingButton
                  onClick={sendOtp}
                  endIcon={<SendIcon />}
                  loading={loading}
                  sx={{ mr: "190px" }}
                  loadingPosition="end"
                  variant="contained"
                >
                  <span>Send Otp</span>
                </LoadingButton>
                <Button variant="outlined" onClick={() => navigate("/")}>
                  Back
                </Button>
                
              </Box>
            </Box>
          </Container>
          <ToastContainer />
        </ThemeProvider>
      ) : (
        <ResetPassword email={email} setShowForm={setShowForm} />
      )}
    </>
  );
};

export default ForgatePassword;
