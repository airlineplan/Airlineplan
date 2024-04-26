import React, { useState, useEffect } from "react";
import {
  Button,
  MenuItem,
  Stack,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stepper,
  Box,
  Step,
  StepLabel,
} from "@mui/material";
import NetworkTable from "./NetworkTable";
import SectorsTable from "./SectorsTable";
import FlgtsTable from "./FlgtsTable";
import DashboardTable from "./DashboardTable";
import StationsTable from "./StationsTable.jsx";
import Rotations from "./Rotations.jsx";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

const steps = ["Network", "Sectors", "Stations", "Rotations", "FLGTs", "Dashboard"];

const MainPage = () => {
  const [network, setNetwork] = useState("network");
  const [sector, setSector] = useState("sectors");
  const [activeStep, setActiveStep] = useState(0);
  const [flightsData, setFlightsData] = useState(null);
  const navigate = useNavigate();

  const handleStep = (step) => () => {
    setActiveStep(step);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      navigate("/homepage");
    } else {
      navigate("/");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    // Display the toast notification for successful logout
    toast.success("Logout successful!");

    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  const fetchFlightsData = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.get("https://airlineplan.com/flight", {
        headers: {
          "x-access-token": accessToken,
        },
      });
      setFlightsData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // const createConnections = async () => {
  //   try {
  //     const accessToken = localStorage.getItem("accessToken");
  //     localStorage.setItem("isConnectionsDone", false); // Set to false before making the request

  //     const response = await axios.get("https://airlineplan.com/createConnections", {
  //       headers: {
  //         "x-access-token": accessToken,
  //       },
  //     });

  //     // Check if the response is successful
  //     if (response.status === 200) {
  //       console.log("Create Connections");
  //       localStorage.setItem("isConnectionsDone", true); // Set to true after a successful request
  //     } else {
  //       console.error("Error fetching data: Invalid response status");
  //     }
  //   } catch (error) {
  //     console.error("Error fetching data:", error);
  //     // Ensure to handle any errors properly, you might want to set isConnectionsDone to false here too, depending on your application logic
  //     localStorage.setItem("isConnectionsDone", false);
  //   }
  // };

  const isAnyTableWithData = () => {
    return (
      flightsData !== null || // Check if flightsData is not null
      NetworkTable.length > 0 ||
      SectorsTable.length > 0 ||
      FlgtsTable.length > 0 ||
      DashboardTable.length > 0
    );
  };

  useEffect(() => {
    // Run createConnections only when activeStep is 1, 2, or 4
    // if (activeStep ===  5) {
    //   createConnections();
    // }

    // Fetch flights data for all steps except step 3
    if (activeStep === 4) {
      fetchFlightsData();
    }
  }, [activeStep]);


  return (
    <Stack gap="10px" sx={{ px: "4%", mt: "1%" }}>
      <Stack sx={{ width: "100%" }}>
        <Box sx={{ display: "flex", width: "100%" }}>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{ width: "100%" }}
          >
            {steps.map((label, index) => (
              <Step key={index} onClick={handleStep(index)}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Button
            variant="outlined"
            onClick={handleLogout}
            sx={{
              textTransform: "capitalize",
              width: "fit-content",
              height: "fit-content",
              borderColor: "#FF5733",
              color: "white",
              bgcolor: "#FF5733",
              "&:hover": {
                bgcolor: "#F4522B",
                color: "white",
                borderColor: "#F4522B",
                boxShadow: "0.5px 2px 3px #888888",
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Stack>
      {/* <Stack> */}
      {/* </Stack> */}
      <Stack>
        {activeStep === 0 ? (
          <NetworkTable />
        ) : activeStep === 1 ? (
          <SectorsTable/>
        ) : activeStep === 2 ? (
          <StationsTable/>

        ) : activeStep === 3 ? (
          <Rotations/>
        ) : activeStep === 4 ? (
          <FlgtsTable flightsData={flightsData} isMaster={true}/>
        ) : activeStep === 5 ? (
          <DashboardTable />

        ) : (
          <></>
        )}
      </Stack>

    </Stack>
  );
};

export default MainPage;
