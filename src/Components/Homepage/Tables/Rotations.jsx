import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Container,
  Stack,
  Box,
  Grid,
  Paper,
  Table,
  TableHead,
  TableRow,
  IconButton,
  TableCell,
  TableBody,
  TextField,
  Button,
  MenuItem,
  Typography,
  Pagination,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import moment from "moment";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import LoadingButton from "@mui/lab/LoadingButton";
import FlgtsTable from "./FlgtsTable";

const DropDownMenu = ({ data, onChange, fieldProps, selectedValue }) => {
  const handleChange = (event) => {
    const selectedValue = event.target.value;
    onChange(selectedValue);
  };

  return (
    <TextField
      size="small"
      select
      style={{ width: "135px" }}
      sx={{
        width: "135px",
        "& .MuiSelect-select": {
          paddingTop: "6px",
          paddingBottom: "6px",
          fontSize: "14px",
          lineHeight: "1.8",
        },
        "& .MuiMenuItem-root": {
          fontSize: "14px",
          lineHeight: "1.8",
        },
      }}
      {...fieldProps}
      value={selectedValue} // Set the selected value
      onChange={handleChange}
    >
      {data.map((item) => (
        <MenuItem key={item.value} value={item.value}>
          {item.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

const RotationDropDownMenu = ({
  data,
  handleRotationChange,
  selectedRotation,
}) => {
  const [newRotationVal, setNewRotationVal] = useState(selectedRotation || "");
  const options = [{ value: "new", label: "New" }, ...data];

  const handleChange = async (event) => {
    const selectedValue = event.target.value;
    const newRotationVal = await handleRotationChange(selectedValue);

    setNewRotationVal(newRotationVal);
  };

  // Check if newRotationVal is not already in options before adding it
  const isRotationValInOptions = options.some(
    (item) => item.value === newRotationVal
  );
  const updatedOptions = isRotationValInOptions
    ? options
    : [{ value: newRotationVal, label: newRotationVal }, ...options];

  // Separate the "New" option and other options
  const newOption = updatedOptions.find((item) => item.value === "new");
  const otherOptions = updatedOptions.filter((item) => item.value !== "new");

  // Sort other options alphabetically based on the label
  otherOptions.sort((a, b) => a.label.localeCompare(b.label));

  // Combine the "New" option and other options
  const sortedOptions = [newOption, ...otherOptions];

  return (
    <TextField
      select
      size="small"
      style={{ width: "135px" }}
      onChange={handleChange}
      value={newRotationVal}
      sx={{
        width: "135px", // Set the width of the TextField
        "& .MuiSelect-select": {
          // Target the select element within the TextField
          paddingTop: "6px", // Adjust the top padding as needed
          paddingBottom: "6px", // Adjust the bottom padding as needed
          fontSize: "14px", // Set the font size
          lineHeight: "1.8", // Adjust the line height as needed
        },
        "& .MuiMenuItem-root": {
          // Target the MenuItem elements
          fontSize: "14px", // Set the font size
          lineHeight: "1.8", // Adjust the line height as needed
        },
      }}
    >
      {sortedOptions.map((item) => (
        <MenuItem key={item.value} value={item.value}>
          {item.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

const Rotations = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [arrow, setArrow] = useState({ column: null, direction: "Up" });
  const [flgtsTableData, setFlgtsTableData] = useState([]);
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [flight, setFlight] = useState("");
  const [depStn, setDepStn] = useState("");
  const [std, setStd] = useState("");
  const [bt, setBt] = useState("");
  const [sta, setSta] = useState("");
  const [arrStn, setArrStn] = useState("");
  const [gt, setGt] = useState("00:00");
  const [sector, setSector] = useState("");
  const [variant, setVariant] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [seats, setSeats] = useState("");
  const [cargoCapT, setCargoCapT] = useState("");
  const [dist, setDist] = useState("");
  const [pax, setPax] = useState("");
  const [cargoT, setCargoT] = useState("");
  const [ask, setAsk] = useState("");
  const [rsk, setRsk] = useState("");
  const [cargoAtk, setCargoAtk] = useState("");
  const [cargoRtk, setCargoRtk] = useState("");
  const [domIntl, setDomIntl] = useState("");
  const [userTag1, setUserTag1] = useState("");
  const [userTag2, setUserTag2] = useState("");
  const [remarks1, setRemarks1] = useState("");
  const [remarks2, setRemarks2] = useState("");
  const [rotation, setRotation] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [arrowDirection, setArrowDirection] = useState(true);
  const [listOfVariant, setListOfVariant] = useState([]);
  const [listOfRotation, setListOfRotations] = useState([]);
  const [selectedRotation, setSelectedRotation] = useState("");
  const [rotationTag, setRotationTag] = useState("");
  const [effFromDate, setEffFromDate] = useState(null); // Use a Date object
  const [effToDate, setEffToDate] = useState(null); // Use a Date object
  const [dow, setDow] = useState("");
  const [depCount, setDepCount] = useState(1);
  const [leftPanelError, setLeftPanelError] = useState(false);
  const [rotationDevelopmentTableData, setRotationDevelopmentTableData] =
    useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrevLoading, setIsPrevLoading] = useState(false);
  const [isRotationDeleting, setIsRotationDeleting] = useState(false);
  const [editable, setEditable] = useState(true);
  const [originalDepStn, setOriginalDepStn] = useState("");
  const [originalStd, setOriginalStd] = useState("");
  const [filter, setFilter] = useState({
    flight: "",
    depStn: "",
    std: "",
    bt: "",
    sta: "",
    arrStn: "",
    variant: "",
    date: "",
    day: "",
  });

  const flightInputRef = useRef(null);

  const handleRotationChange = async (event) => {
    if (event == "new") {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get(
          "http://localhost:3000/getNextRotationNumber",
          {
            headers: {
              "x-access-token": accessToken,
            },
          }
        );
        setSelectedRotation(response.data.nextRotationNumber);

        //set rotation summary value to default
        setEffToDate(null);
        setEffFromDate(null);
        setDow("");
        setRotationDevelopmentTableData([]);
        setEditable(true);
        return response.data.nextRotationNumber;
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    } else {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get(
          `http://localhost:3000/rotationbyid/${event}`,
          {
            headers: {
              "x-access-token": accessToken,
            },
          }
        );

        const { rotationDetails, rotationSummary } = response.data;

        // Set rotation development table data and selected rotation
        setRotationDevelopmentTableData(rotationDetails);
        setSelectedRotation(parseInt(event));

        setSelectedVariant(rotationSummary.variant);
        setEffFromDate(rotationSummary.effFromDt);
        setEffToDate(rotationSummary.effToDt);
        setDow(rotationSummary.dow);

        return event;
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
  };

  // useEffect(() => {
  //     if (selectedRotation && selectedVariant) {
  //         // setEditable(false);
  //     }
  // }, [selectedRotation, selectedVariant]);

  useEffect(() => {
    // Call getFgtsWORotations when rotationDetails, rotationSummary, and other states are updated
    if (
      selectedRotation &&
      selectedVariant &&
      effFromDate &&
      effToDate &&
      dow
    ) {
      setEditable(false);

      if (!editable) {
        getFgtsWORotations();
      }
    }
  }, [
    selectedRotation,
    selectedVariant,
    effFromDate,
    effToDate,
    rotationDevelopmentTableData,
    editable,
  ]);

  const getFgtsWORotations = async () => {
    const lastObjectIndex = rotationDevelopmentTableData.length - 1;
    let allowedDeptStn, allowedStdLt;

    if (lastObjectIndex >= 0) {
      const lastObject = rotationDevelopmentTableData[lastObjectIndex];
      const { arrStn, sta, gt } = lastObject;
      allowedDeptStn = arrStn;
      allowedStdLt = addTime(sta, gt);
    } else {
      allowedDeptStn = "";
      allowedStdLt = "";
    }

    const requestData = {
      allowedDeptStn,
      allowedStdLt,
      selectedVariant,
      effToDate,
      effFromDate,
      dow,
    };

    const responseFlgts = await axios.post(
      "http://localhost:3000/flightsWoRotations",
      requestData,
      {
        headers: {
          "x-access-token": `${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Flights data is " + JSON.stringify(responseFlgts.data.data));
    setFlgtsTableData(responseFlgts.data.data);
  };

  const RowsPerPage = 8;

  const sortedData = () => {
    if (!arrow.column) return flgtsTableData;

    const sorted = [...flgtsTableData].sort((a, b) => {
      const colA = a[arrow.column];
      const colB = b[arrow.column];

      if (arrow.direction === "Up") {
        return colA.localeCompare(colB);
      } else {
        return colB.localeCompare(colA);
      }
    });

    return sorted;
  };

  const handleArrow = (columnName) => {
    setArrow((prevArrow) => ({
      column: columnName,
      direction:
        prevArrow.column === columnName && prevArrow.direction === "Up"
          ? "Down"
          : "Up",
    }));
  };

  const handleArrowDirection = () => {
    setArrowDirection(!arrowDirection);
  };

  const handleDate = (e) => {
    setDate(e.target.value);
  };
  const handleDay = (e) => {
    setDay(e.target.value);
  };
  const handleFlight = (event) => {
    setFlight(event.target.value);
  };
  const handleDepStn = (event) => {
    setDepStn(event.target.value);
  };
  const handleSTD = (event) => {
    setStd(event.target.value);
  };
  const handleBT = (event) => {
    setBt(event.target.value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilter((prevFilter) => ({
      ...prevFilter,
      [name]: value,
    }));
  };

  const handleSTA = (event) => {
    setSta(event.target.value);
  };
  const handleArrStn = (event) => {
    setArrStn(event.target.value);
  };

  const handleVariant = (event) => {
    setVariant(event.target.value);
  };

  const handleDropDownChange = (selectedValue) => {
    setSelectedVariant(selectedValue);
    if (selectedRotation && selectedVariant) {
      setEditable(false);
    }
  };

  const startIndex = (currentPage - 1) * RowsPerPage;
  const endIndex = startIndex + RowsPerPage;

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleSave = async () => {
    try {
      if (
        !selectedRotation ||
        !effFromDate ||
        !effToDate ||
        !dow ||
        !selectedVariant
      ) {
        // Handle the case where one or more fields are empty
        console.error(
          "One or more fields are empty. Please fill in all required fields."
        );
        return;
      }

      // Make a single request to update all fields
      await axios.post(
        "http://localhost:3000/updateRotationSummary",
        {
          rotationNumber: selectedRotation,
          rotationTag,
          effFromDate,
          effToDate,
          dow,
          selectedVariant,
        },
        {
          headers: {
            "x-access-token": `${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Once saved, set fields as uneditable
      setEditable(false);
    } catch (error) {
      console.error("Error updating RotationSummary:", error);
    }
  };

  const fieldProps = editable ? {} : { disabled: true };
  const rotationDevelopmentProps = editable ? { disabled: true } : {};

  const totalBt = useMemo(() => {
    const totalMinutes = rotationDevelopmentTableData.reduce((total, item) => {
      // Check if item.bt is defined and has the expected format
      if (item.bt && /^\d{2}:\d{2}$/.test(item.bt)) {
        const [hours, minutes] = item.bt.split(":").map(Number);
        return total + hours * 60 + minutes;
      }
      return total;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }, [rotationDevelopmentTableData]);

  const totalGt = useMemo(() => {
    const totalMinutes = rotationDevelopmentTableData.reduce((total, item) => {
      // Check if item.bt is defined and has the expected format
      if (item.gt && /^\d{2}:\d{2}$/.test(item.gt)) {
        const [hours, minutes] = item.gt.split(":").map(Number);
        return total + hours * 60 + minutes;
      }
      return total;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }, [rotationDevelopmentTableData]);

  const handleAddCurrent = async () => {
    try {
      setIsLoading(true);

      if (!effFromDate || !effToDate) {
        setLeftPanelError(true);
        console.error("effFromDate and effToDate are required.");
        return;
      }

      const response = await axios.post(
        "http://localhost:3000/addRotationDetailsFlgtChange",
        {
          rotationNumber: selectedRotation,
          depNumber: rotationDevelopmentTableData.length + 1,
          flightNumber: flight,
          depStn: depStn.trim() !== "" ? depStn : originalDepStn,
          std: std.trim() !== "" ? std : originalStd,
          bt,
          sta,
          arrStn,
          variant: selectedVariant,
          dow,
          effFromDate,
          effToDate,
          domIntl,
          gt,
        },
        {
          headers: {
            "x-access-token": `${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setDepCount((prevDepCount) => prevDepCount + 1);

        // createConnections();
        toast.success("Update successful!");

        setRotationDevelopmentTableData((prevData) => {
          return [
            ...prevData,
            {
              rotationNumber: selectedRotation,
              depNumber: depCount,
              flightNumber: flight,
              depStn: depStn.trim() !== "" ? depStn : originalDepStn,
              std: std.trim() !== "" ? std : originalStd,
              bt,
              sta,
              arrStn,
              variant: selectedVariant,
              dow,
              effFromDate,
              effToDate,
              domIntl,
              gt,
            },
          ];
        });

        // Reset form fields
        resetFormFields();

        flightInputRef.current.focus();
      }
    } catch (error) {
      const { flightNumber } = error.response.data; // Extract flightNumber from response data

      toast.error("Error adding current rotation:", flightNumber);

      // Reset form fields
      resetFormFields();

      flightInputRef.current.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Function to reset form fields
  const resetFormFields = () => {
    setFlight("");
    setBt("");
    setSta("");
    setArrStn("");
    setDomIntl("");
    setGt("");
    setDepStn("");
    setStd("");
  };

  const handleDeleteRotation = async () => {
    try {
      // Make an Axios DELETE request to delete the rotation
      setIsRotationDeleting(true);
      const response = await axios.post(
        "http://localhost:3000/deleteCompleteRotation",
        {
          rotationNumber: selectedRotation,
          selectedVariant: selectedVariant,
          totalDepNumber: rotationDevelopmentTableData.length,
        },
        {
          headers: {
            "x-access-token": `${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Check the response status and handle accordingly
      if (response.status === 201 || response.status === 200) {
        toast.success("Update successful!");
        // createConnections();

        if (response.status === 201 || response.status === 200) {
          toast.success("Update successful!");

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }

        setRotationDevelopmentTableData((prevData) => {
          return prevData.filter(
            (row) =>
              row.rotationNumber !== selectedRotation &&
              row.variant !== selectedVariant
          );
        });
      } else {
        console.error("Error deleting rotation:", response.data);
        // Handle the error condition as per your application's requirements
      }
    } catch (error) {
      console.error("Error deleting rotation:", error);
      // Handle the error condition as per your application's requirements
    } finally {
      // Set loading state to false when the request is completed
      setIsRotationDeleting(false);
    }
  };

  const handlePreviousInRotation = async () => {
    try {
      // Make an Axios DELETE request to delete the rotation

      const lastObject =
        rotationDevelopmentTableData[rotationDevelopmentTableData.length - 1];
      let response;
      // Make sure lastObject is defined before proceeding
      if (!lastObject) {
        response = await axios.post(
          "http://localhost:3000/deleteRotation",
          {
            rotationNumber: selectedRotation,
            selectedVariant: selectedVariant,
          },
          {
            headers: {
              "x-access-token": `${localStorage.getItem("accessToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 201 || response.status === 200) {
          toast.success("Update successful!");
          // createConnections();

          setRotationDevelopmentTableData((prevData) => {
            return prevData.filter(
              (row) =>
                row.rotationNumber !== selectedRotation &&
                row.variant !== selectedVariant
            );
          });

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        setIsPrevLoading(true);
        const { _id } = lastObject;
        response = await axios.post(
          "http://localhost:3000/deletePrevInRotation",
          {
            rotationNumber: selectedRotation,
            selectedVariant: selectedVariant,
            depNumber: rotationDevelopmentTableData.length,
            _id: _id,
          },
          {
            headers: {
              "x-access-token": `${localStorage.getItem("accessToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Check the response status and handle accordingly
        if (response.status === 201 || response.status === 200) {
          toast.success("Update successful!");
          // createConnections();

          setRotationDevelopmentTableData((prevData) => {
            // Filter out the lastObject from the previous state array
            const newData = prevData.filter((item) => item._id !== _id);

            // Use the callback to execute code after state update
            // This ensures that the state update is completed before proceeding
            if (newData.length === 0) {
              setDepStn("");
              setStd("");
            }

            return newData;
          });
        }
      }
    } catch (error) {
      console.error("Error deleting rotation:", error);
      // Handle the error condition as per your application's requirements
    } finally {
      // Set loading state to false when the request is completed
      setIsPrevLoading(false);
    }
  };

  const addTime = (firstTime, secondTime) => {
    // Convert firstTime and secondTime to total minutes
    const totalMinutes =
      parseInt(firstTime.split(":")[0]) * 60 +
      parseInt(firstTime.split(":")[1]) +
      parseInt(secondTime.split(":")[0]) * 60 +
      parseInt(secondTime.split(":")[1]);

    // Calculate total hours and minutes remaining
    const totalHours = Math.floor(totalMinutes / 60) % 24; // Remainder when dividing by 24 to wrap around
    const totalMinutesRemaining = totalMinutes % 60;

    // Pad single digit minutes and hours with leading zero
    const formattedHours = totalHours.toString().padStart(2, "0");
    const formattedMinutes = totalMinutesRemaining.toString().padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await axios.get(
          "http://localhost:3000/listVariants",
          {
            headers: {
              "x-access-token": accessToken,
            },
          }
        );
        setListOfVariant(response.data);

        const res = await axios.get("http://localhost:3000/listRotations", {
          headers: {
            "x-access-token": accessToken,
          },
        });
        setListOfRotations(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (rotationDevelopmentTableData.length > 0) {
      const lastItem =
        rotationDevelopmentTableData[rotationDevelopmentTableData.length - 1];
      setStd(addTime(lastItem.sta, lastItem.gt));
      setDepStn(lastItem.arrStn);
    }
  }, [rotationDevelopmentTableData]);

  return (
    <>
      <div>
        <Grid container mt={3} spacing={2}>
          {/* Top Left Container */}
          <Grid item xs={3}>
            <Paper>
              <Stack direction="column" spacing={1}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Labels and Dropdowns */}
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px" }}
                  >
                    Variant:
                  </Typography>
                  <DropDownMenu
                    data={listOfVariant}
                    onChange={handleDropDownChange}
                    fieldProps={fieldProps}
                    selectedValue={selectedVariant}
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Labels and Dropdowns */}
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px" }}
                  >
                    Rotation #:
                  </Typography>
                  <RotationDropDownMenu
                    data={listOfRotation}
                    handleRotationChange={handleRotationChange}
                    selectedRotation={selectedRotation}
                  />
                </Stack>
                {/* Add more rows as needed */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px" }}
                  >
                    Rotation Tag:
                  </Typography>
                  <TextField
                    {...fieldProps}
                    size="small"
                    style={{ width: 135 }}
                    value={rotationTag}
                    onChange={(event) => setRotationTag(event.target.value)}
                    // onBlur={handleRotationTagBlur}
                    inputProps={{
                      style: {
                        padding: "10px",
                        height: "15px",
                        fontSize: "14px",
                      },
                    }}
                  />
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px" }}
                  >
                    Eff from date:
                  </Typography>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        format="DD/MMM/YY"
                        value={dayjs(effFromDate)}
                        size="small"
                        onChange={(date) => setEffFromDate(date)}
                        // onChange={(date) => effFromDtChange(date, 'effFromDate')}
                        slotProps={{
                          field: { shouldRespectLeadingZeros: true },
                        }}
                        sx={{
                          // Set the width of the input field
                          width: "135px",
                          // Target the input element inside the input field
                          "& .MuiInputBase-input": {
                            // Set the height of the input element
                            height: "8px",
                            // Set the font size of the input element
                            fontSize: "14px",
                          },
                          // Target the calendar element
                          "& .MuiPickersCalendar-root": {
                            // Target the day elements inside the calendar
                            "& .MuiPickersDay-root": {
                              // Set the font size of the day elements
                              fontSize: "14px",
                            },
                            // Target the icon button elements inside the calendar header
                            "& .MuiPickersCalendarHeader-iconButton": {
                              // Set the font size of the icon button elements
                              fontSize: "14px",
                            },
                          },
                        }}
                        {...fieldProps}
                      />
                      {/* Conditional rendering of the warning message */}
                      {leftPanelError && !effFromDate && (
                        <Typography
                          variant="body2"
                          sx={{
                            position: "absolute",
                            right: "100%",
                            color: "red",
                          }}
                        >
                          required
                        </Typography>
                      )}
                    </LocalizationProvider>
                  </div>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px" }}
                  >
                    Eff to date:
                  </Typography>

                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        format="DD/MMM/YY"
                        value={dayjs(effToDate)}
                        onChange={(date) => setEffToDate(date)}
                        // onChange={(date) => effToDtChange(date, 'effToDate')}
                        slotProps={{
                          field: { shouldRespectLeadingZeros: true },
                        }}
                        sx={{
                          // Set the width of the input field
                          width: "135px",
                          // Target the input element inside the input field
                          "& .MuiInputBase-input": {
                            // Set the height of the input element
                            height: "8px",
                            // Set the font size of the input element
                            fontSize: "14px",
                          },
                          // Target the calendar element
                          "& .MuiPickersCalendar-root": {
                            // Target the day elements inside the calendar
                            "& .MuiPickersDay-root": {
                              // Set the font size of the day elements
                              fontSize: "14px",
                            },
                            // Target the icon button elements inside the calendar header
                            "& .MuiPickersCalendarHeader-iconButton": {
                              // Set the font size of the icon button elements
                              fontSize: "14px",
                            },
                          },
                        }}
                        {...fieldProps}
                      />
                      {/* Conditional rendering of the warning message */}
                      {leftPanelError && !effToDate && (
                        <Typography
                          variant="body2"
                          sx={{
                            position: "absolute",
                            right: "100%",
                            color: "red",
                          }}
                        >
                          required
                        </Typography>
                      )}
                    </LocalizationProvider>
                  </div>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px" }}
                  >
                    DoW:
                  </Typography>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "bottom",
                      justifyContent: "flex-end",
                    }}
                  >
                    <TextField
                      {...fieldProps}
                      value={dow}
                      style={{ width: 135 }}
                      size="small"
                      onChange={(event) => setDow(event.target.value)}
                      // onBlur={handleDowBlur}
                      inputProps={{
                        style: {
                          padding: "10px",
                          height: "15px",
                          fontSize: "14px",
                        },
                      }}
                    />
                    {leftPanelError && !dow && (
                      <Typography
                        variant="body2"
                        sx={{
                          position: "absolute",
                          right: "100%",
                          color: "red",
                        }}
                      >
                        DoW is required.
                      </Typography>
                    )}
                    {leftPanelError && dow && isNaN(dow) && (
                      <Typography
                        variant="body2"
                        sx={{
                          position: "absolute",
                          right: "100%",
                          color: "red",
                        }}
                      >
                        DoW must be a number.
                      </Typography>
                    )}
                  </div>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px", flex: "1", textAlign: "start" }}
                  >
                    BH total:
                  </Typography>
                  <Typography
                    variant="p"
                    color="text.secondary"
                    style={{ flex: "1", textAlign: "center" }}
                  >
                    {totalBt}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px", flex: "1", textAlign: "start" }}
                  >
                    GT total:
                  </Typography>
                  <Typography
                    variant="p"
                    color="text.secondary"
                    style={{ flex: "1", textAlign: "center" }}
                  >
                    {totalGt}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    color="text.secondary"
                    style={{ fontSize: "14px", flex: "1", textAlign: "start" }}
                  >
                    Rtn total time:
                  </Typography>
                  <Typography
                    variant="p"
                    color="text.secondary"
                    style={{ flex: "1", textAlign: "center" }}
                  >
                    {addTime(totalBt, totalGt)}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="end"
                  sx={{ width: "100%", height: "32px", marginTop: "5px" }}
                >
                  {/* Your other components here */}
                  {editable && (
                    <Box sx={{ mr: 2 }}>
                      {" "}
                      {/* Adjust the marginRight value as needed */}
                      <Button
                        variant="contained"
                        color="primary"
                        sx={{ width: "100px", height: "32px" }}
                        onClick={handleSave}
                      >
                        Save
                      </Button>
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* Top Right Container */}
          <Grid item xs={8} ml={4}>
            <Typography color="text.secondary" style={{ fontSize: "16px" }}>
              Rotation Development
            </Typography>
            <Paper>
              <Table style={{ width: "100%" }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      Dep #
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      Flight #
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      Dep Stn
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      STD(LT)
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      BT
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      STA(LT)
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      Arr Stn
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      Dom / INTL
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingX: "0px",
                        paddingY: "5px",
                        textAlign: "center",
                      }}
                    >
                      GT
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rotationDevelopmentTableData.map((row, index) => (
                    <TableRow key={row._id}>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.flightNumber}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.depStn}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.std}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.bt}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.sta}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.arrStn}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.domIntl}
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.gt}
                      </TableCell>
                      {/* Add more table cells for additional columns */}
                    </TableRow>
                  ))}
                  {selectedRotation !== "" && (
                    <TableRow key={1} style={{ width: "50px" }}>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {rotationDevelopmentTableData.length + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          ref={flightInputRef}
                          sx={{ width: "65px" }}
                          size="small"
                          value={flight}
                          onChange={(e) => setFlight(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          sx={{ width: "65px" }}
                          size="small"
                          // Use optional chaining to access arrStn only if rotationDevelopmentTableData exists and is not empty
                          value={depStn}
                          onChange={(e) => setDepStn(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          sx={{ width: "85px" }}
                          size="small"
                          type="time"
                          ampm={false}
                          value={std}
                          onChange={(e) => setStd(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          sx={{ width: "85px" }}
                          size="small"
                          type="time"
                          ampm={false}
                          value={bt}
                          onChange={(e) => setBt(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          sx={{ width: "85px" }}
                          size="small"
                          type="time"
                          ampm={false}
                          value={sta}
                          onChange={(e) => setSta(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          size="small"
                          sx={{ width: "65px" }}
                          value={arrStn}
                          onChange={(e) => setArrStn(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          size="small"
                          sx={{ width: "65px" }}
                          value={domIntl}
                          onChange={(e) => setDomIntl(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: "8px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        <TextField
                          sx={{ width: "85px" }}
                          size="small"
                          type="time"
                          ampm={false}
                          value={gt}
                          onChange={(e) => setGt(e.target.value)}
                          inputProps={{
                            style: {
                              padding: "10px",
                              height: "15px",
                              fontSize: "12px",
                            },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Buttons */}
              <Stack direction="row" justifyContent="space-between" mt={4}>
                <LoadingButton
                  variant="contained"
                  onClick={handleDeleteRotation}
                  sx={{
                    textTransform: "capitalize",
                    borderColor: "#FF5733",
                    color: "#FFF",
                    "&:hover": {
                      bgcolor: "#7a98cc",
                      color: "white",
                      borderColor: "#FF5733",
                    },
                  }}
                  loading={isRotationDeleting}
                  {...rotationDevelopmentProps}
                >
                  Delete Rotation
                </LoadingButton>
                {/* Spacer */}
                <Stack direction="row" spacing={2}>
                  <LoadingButton
                    variant="contained"
                    sx={{
                      textTransform: "capitalize",
                      borderColor: "#FF5733",
                      color: "#FFF",
                      "&:hover": {
                        bgcolor: "#7a98cc",
                        color: "white",
                        borderColor: "#FF5733",
                      },
                    }}
                    {...rotationDevelopmentProps}
                    onClick={handlePreviousInRotation}
                    loading={isPrevLoading}
                  >
                    Delete Previous
                  </LoadingButton>
                  <LoadingButton
                    variant="contained"
                    sx={{
                      textTransform: "capitalize",
                      borderColor: "#FF5733",
                      color: "#FFF",
                      "&:hover": {
                        bgcolor: "#7a98cc",
                        color: "white",
                        borderColor: "#FF5733",
                      },
                    }}
                    {...rotationDevelopmentProps}
                    onClick={handleAddCurrent}
                    loading={isLoading} // loading state boolean
                  >
                    Add Current
                  </LoadingButton>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* Bottom Left Container */}
          <Grid item xs={3}>
            {/* Void Space */}
          </Grid>

          {/* Bottom Right Container */}
          <Grid item xs={8} ml={4}>
            <Typography color="text.secondary" style={{ fontSize: "16px" }}>
              Flights not assigned to a rotation
            </Typography>

            <Paper>
              <Stack
                sx={{ overflowX: "scroll", scrollbarWidth: "thin" }}
                className="custom-scrollbar"
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <Typography
                          sx={{ fontWeight: "bold", fontSize: "14px" }}
                        >
                          Filter:-
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          placeholder="Date"
                          onChange={handleChange}
                          name="date"
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          placeholder="Day"
                          name="day"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          name="flight"
                          placeholder="Flight #"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          name="depStn"
                          placeholder="Dep Stn"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          name="std"
                          placeholder="STD(LT)"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          name="bt"
                          placeholder="BT"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          name="sta"
                          placeholder="STA(LT)"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          name="arrStn"
                          placeholder="Arr Stn"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ paddingX: "4px" }}>
                        <TextField
                          variant="outlined"
                          size="small"
                          name="variant"
                          placeholder="Variant"
                          onChange={handleChange}
                          sx={{
                            minWidth: "10px",
                            fontSize: "10px",
                            "& .MuiOutlinedInput-input": { fontSize: "12px" },
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#F5F5F5" }}>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          marginLeft: "50px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        S.No
                        <IconButton>
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        Date
                        <IconButton
                          onClick={() => {
                            handleArrow("date");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        Day
                        <IconButton
                          onClick={() => {
                            handleArrow("day");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        Flight #
                        <IconButton
                          onClick={() => {
                            handleArrow("flight");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        Dep Stn
                        <IconButton
                          onClick={() => {
                            handleArrow("depStn");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        STD(LT)
                        <IconButton
                          onClick={() => {
                            handleArrow("std");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        BT
                        <IconButton
                          onClick={() => {
                            handleArrow("bt");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        STA(LT)
                        <IconButton
                          onClick={() => {
                            handleArrow("sta");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        Arr Stn
                        <IconButton
                          onClick={() => {
                            handleArrow("arrStn");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "12px",
                          paddingX: "0px",
                          paddingY: "5px",
                          textAlign: "center",
                        }}
                      >
                        Variant
                        <IconButton
                          onClick={() => {
                            handleArrow("variant");
                            handleArrowDirection();
                          }}
                        >
                          {arrowDirection ? (
                            <ArrowUpwardIcon sx={{ fontSize: "16px" }} />
                          ) : (
                            <ArrowDownwardIcon sx={{ fontSize: "16px" }} />
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedData()
                      ?.filter(
                        (row) =>
                          (row.flight || "")
                            ?.toLowerCase()
                            .includes(filter.flight?.toLowerCase()) &&
                          (row.depStn || "")
                            ?.toLowerCase()
                            ?.includes(filter.depStn?.toLowerCase()) &&
                          (row.std || "")
                            ?.toLowerCase()
                            ?.includes(filter.std?.toLowerCase()) &&
                          (row.bt || "")
                            ?.toLowerCase()
                            ?.includes(filter.bt?.toLowerCase()) &&
                          (row.sta || "")
                            ?.toLowerCase()
                            ?.includes(filter.sta?.toLowerCase()) &&
                          (row.arrStn || "")
                            ?.toLowerCase()
                            ?.includes(filter.arrStn?.toLowerCase()) &&
                          (row.variant || "")
                            ?.toLowerCase()
                            ?.includes(filter.variant?.toLowerCase()) &&
                          (moment(row.date).format("DD-MMM-YY") || "")
                            ?.toLowerCase()
                            ?.includes(filter.date?.toLowerCase()) &&
                          (row.day || "")
                            ?.toLowerCase()
                            ?.includes(filter.day?.toLowerCase())
                      )
                      ?.map((row, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            backgroundColor:
                              index % 2 !== 0 ? "#f0f0f0" : "inherit",
                          }}
                        >
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {(currentPage - 1) * 8 + index + 1}
                          </TableCell>
                          <TableCell
                            sx={{
                              whiteSpace: "nowrap",
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {moment(row.date).format("DD-MMM-YY")}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.day}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.flight}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.depStn}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.std}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.bt}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.sta}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.arrStn}
                          </TableCell>
                          <TableCell
                            sx={{
                              paddingX: "0px",
                              paddingY: "12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {row.variant}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Stack>
              <Stack direction="row" justifyContent="end">
                <Pagination
                  count={Math.ceil(flgtsTableData?.length / RowsPerPage)}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Stack>
              {/* <FlgtsTable flightsData={flgtsTableData} isMaster={false}/> */}
            </Paper>
          </Grid>
        </Grid>
      </div>
      <ToastContainer />
    </>
  );
};

export default Rotations;
