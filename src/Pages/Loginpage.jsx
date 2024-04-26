import React, { useEffect, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { Link } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import axios from 'axios';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from 'react-router-dom';
import { List, ListItem, ListItemText } from '@mui/material';
import LoadingButton from "@mui/lab/LoadingButton";
import TermsAndConditionsModal from '../Components/Homepage/TermsAndConditionsModal'
import backgroundPic from "../assets/Images/bglogin.jpeg"
import './loginPage.css'



const defaultTheme = createTheme();

export default function Loginpage() {

  const customStyles = {
    normal: {
      fontFamily: 'Calibri, Arial, sans-serif',
      fontSize: '14px',
      color: 'black',
    },
    link: {
      fontFamily: 'Calibri, Arial, sans-serif',
      fontSize: '14px',
      marginLeft: '3px'
    }
  };

  const [email, setEmail] = useState()
  const [password, setPassword] = useState()
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://airlineplan.com/user-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('accessToken', data.token);
        toast.success(data.message);
        setLoading(false);

        setTimeout(() => {
          navigate('/homepage');
        }, 1500);
      } else {
        toast.error(data.error);
        setLoading(false);

      }
    } catch (error) {
      console.error(error);
      setLoading(false);

    }
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      navigate('/homepage');
    } else {
      navigate('/');
    }
  }, []);



  return (
    <div className={`loginPage ${location.pathname === '/' ? 'withBackground' : ''}`}>
      <ThemeProvider theme={defaultTheme}>
        <Grid container
          spacing={2}
          justifyContent="center"
          alignItems="center"
          style={{ minHeight: '80vh', width: "100%", margin: "auto" }}>
          <Grid item md={6} >
            <List>
              <ListItem sx={{ "&::before": { content: '"\\2022"', paddingRight: '8px' } }}>
                <ListItemText primary="Develop flight schedules from scratch or upload existing schedules" primaryTypographyProps={{ variant: 'body1', style: { fontSize: '18px', fontWeight: 'bold', userSelect: 'none' } }} />
              </ListItem>
              <ListItem sx={{ "&::before": { content: '"\\2022"', paddingRight: '8px' } }} >
                <ListItemText primary="Change flights, add flights, delete flights" primaryTypographyProps={{ variant: 'body1', style: { fontSize: '18px', fontWeight: 'bold', userSelect: 'none' } }} />
              </ListItem>
              <ListItem sx={{ "&::before": { content: '"\\2022"', paddingRight: '8px' } }} >
                <ListItemText primary="Add capacities and input loads" primaryTypographyProps={{ variant: 'body1', style: { fontSize: '18px', fontWeight: 'bold', userSelect: 'none' } }} />
              </ListItem>
              <ListItem sx={{ "&::before": { content: '"\\2022"', paddingRight: '8px' } }} >
                <ListItemText primary="Get network commercial and schedule operational metrics - departures, destinations, seats, pax, load factors ...etc at network level or by Sector(s), Station(s)...etc or by custom tags" primaryTypographyProps={{ variant: 'body1', style: { fontSize: '18px', fontWeight: 'bold', userSelect: 'none' } }} />
              </ListItem>
              <ListItem sx={{ "&::before": { content: '"\\2022"', paddingRight: '8px' } }} >
                <ListItemText primary="Connections automatically identified in schedule based on domestic/international connection windows by station" primaryTypographyProps={{ variant: 'body1', style: { fontSize: '18px', fontWeight: 'bold', userSelect: 'none' } }} />
              </ListItem>
              <ListItem sx={{ "&::before": { content: '"\\2022"', paddingRight: '8px' } }} >
                <ListItemText primary="Build Rotations to assign flights to fleet; Get average daily utilisation" primaryTypographyProps={{ variant: 'body1', style: { fontSize: '18px', fontWeight: 'bold', userSelect: 'none' } }} />
              </ListItem>
            </List>
          </Grid>
          <Grid item md={6} >
            <CssBaseline />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '65%', // Set the width to 50%
                marginLeft: 'auto', // Align to the left by setting marginLeft to auto
                marginRight: 'auto',
              }}
            >
              <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                <LockOutlinedIcon />
              </Avatar>
              <Typography component="h1" variant="h5" style={{ userSelect: 'none' }}>
                Sign in
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
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus                  
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}                  
                />
                <FormControlLabel
                  control={<Checkbox value="remember" color="primary" />}
                  label="Remember me"
                  style={{ userSelect: 'none' }}
                />
                <LoadingButton
                  onClick={handleLogin}
                  loading={loading}
                  variant="contained"
                  sx={{ mt: 3, mb: 2, width: "100%" }}

                >
                  <span>Sign In</span>
                </LoadingButton>
                <Grid container>
                  <Grid item xs>
                    <Link to="/forget" variant="body2" style={{ color: 'black', userSelect: 'none' }}>
                      Forgot password?
                    </Link>
                  </Grid>
                  <Grid item>
                    <Link to="/signup" variant="body2" style={{ color: 'black', userSelect: 'none' }}>
                      {"Don't have an account? Sign Up"}
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Stack direction="column" justifyContent="center" alignItems="center" mb={4}>
          <TermsAndConditionsModal />
          <Button variant="outlined" color="primary" style={{ width: "150px" }}>
            <Link to="/contact" variant="body2" style={customStyles.link}>
              Contact Us
            </Link>
          </Button>
        </Stack>
      </ThemeProvider >
      <ToastContainer />
    </div >
  );
}