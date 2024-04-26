import React, { useState, useEffect } from 'react';
import { Typography, Stack, Select, MenuItem, Table, TableHead, TableRow, TextField, TableCell, TableBody } from '@mui/material';
import { ToastContainer, toast } from "react-toastify";
import LoadingButton from "@mui/lab/LoadingButton";
import axios from "axios";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from 'dayjs';


const StationsTable = () => {

  const timezones = [
    'UTC-12:00', 'UTC-11:45', 'UTC-11:30', 'UTC-11:15', 'UTC-11:00', 'UTC-10:45', 'UTC-10:30', 'UTC-10:15', 'UTC-10:00', 'UTC-9:45', 'UTC-9:30', 'UTC-9:15', 'UTC-9:00', 'UTC-8:45', 'UTC-8:30', 'UTC-8:15', 'UTC-8:00', 'UTC-7:45', 'UTC-7:30', 'UTC-7:15', 'UTC-7:00', 'UTC-6:45', 'UTC-6:30', 'UTC-6:15', 'UTC-6:00', 'UTC-5:45', 'UTC-5:30', 'UTC-5:15', 'UTC-5:00', 'UTC-4:45', 'UTC-4:30', 'UTC-4:15', 'UTC-4:00', 'UTC-3:45', 'UTC-3:30', 'UTC-3:15', 'UTC-3:00', 'UTC-2:45', 'UTC-2:30', 'UTC-2:15', 'UTC-2:00', 'UTC-1:45', 'UTC-1:30', 'UTC-1:15', 'UTC-1:00', 'UTC-0:45', 'UTC-0:30', 'UTC-0:15', 'UTC+0:00', 'UTC+0:15', 'UTC+0:30', 'UTC+0:45', 'UTC+1:00', 'UTC+1:15', 'UTC+1:30', 'UTC+1:45', 'UTC+2:00', 'UTC+2:15', 'UTC+2:30', 'UTC+2:45', 'UTC+3:00', 'UTC+3:15', 'UTC+3:30', 'UTC+3:45', 'UTC+4:00', 'UTC+4:15', 'UTC+4:30', 'UTC+4:45', 'UTC+5:00', 'UTC+5:15', 'UTC+5:30', 'UTC+5:45', 'UTC+6:00', 'UTC+6:15', 'UTC+6:30', 'UTC+6:45', 'UTC+7:00', 'UTC+7:15', 'UTC+7:30', 'UTC+7:45', 'UTC+8:00', 'UTC+8:15', 'UTC+8:30', 'UTC+8:45', 'UTC+9:00', 'UTC+9:15', 'UTC+9:30', 'UTC+9:45', 'UTC+10:00', 'UTC+10:15', 'UTC+10:30', 'UTC+10:45', 'UTC+11:00', 'UTC+11:15', 'UTC+11:30', 'UTC+11:45', 'UTC+12:00'
  ];

  const [selectedHomeTimeZone, setSelectedHomeTimeZone] = useState('UTC+5:30');
  const [previousStations, setPreviousStations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);


  const handleTimeZoneChange = (event) => {
    setSelectedHomeTimeZone(event.target.value);
  };

  const [data, setData] = useState([]);

  const handleInputChange = (newValue, rowIndex, columnName) => {
    let value;
    // Check if newValue is a date object
    if (newValue instanceof Date) {
      value = newValue; // Store the date object directly
    } else {
      // If not a date object, assume it's a standard event and extract the value
      value = newValue.target ? newValue.target.value : newValue;
    }

    const newData = data.map((row, index) => {
      if (index === rowIndex) {
        return {
          ...row,
          [columnName]: value,
        };
      }
      return row;
    });

    setData(newData);
  };

  function isInRange(value, range) {
    return value >= range[0] && value <= range[1];
  }


  function normalizeTimeFormat(time) {
    // Extract digits from the input
    const extractedDigits = time.match(/\d+/g);

    if (!extractedDigits || extractedDigits.length < 2) {
      // If no digits are found, return an empty string or handle it as needed
      return '';
    }

    // Take the first two groups of digits as hours and minutes
    const [hours, minutes] = extractedDigits.slice(0, 2).map(Number);

    // Return the normalized time in HH:mm format
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const range1 = ['00:20', '03:00'];
  const range2 = ['00:30', '04:00'];
  const range3 = ['02:00', '10:00'];

  const isValidDDMinTime = (value) => {
    const normalizedValue = normalizeTimeFormat(value);
    return isInRange(normalizedValue, range1);
  };

  const isValidIIMinTime = (value) => {
    const normalizedValue = normalizeTimeFormat(value);
    return isInRange(normalizedValue, range2);

  };

  const isValidIIMaxTime = (value) => {
    const normalizedValue = normalizeTimeFormat(value);
    return isInRange(normalizedValue, range3);
  };

  const saveStation = async () => {
    try {
      setIsLoading(true)
      const accessToken = localStorage.getItem("accessToken");

      // Prepare the data to be sent to the backend
      const requestData = {
        stations: data, // Station data
        homeTimeZone: selectedHomeTimeZone, // Selected home timezone
      };

      const response = await axios.post('https://airlineplan.com/saveStation', requestData, {
        headers: {
          "x-access-token": accessToken,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 201 || response.status === 200) {
        toast.success("Update successful!");

        // Call createConnections only if stations array has changed
        // createConnections();
        // Update the previous stations array
        setPreviousStations(data);

        setTimeout(() => {
          window.location.reload();
        }, 2000);

      }
      console.log(response.data);
    } catch (error) {
      toast.error("An error occurred while processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");

        const response = await axios.get("https://airlineplan.com/get-stationData", {
          headers: {
            "x-access-token": accessToken,
          },
        });
        console.log(response.data, "response.data");
        setData(response.data.data);
        setPreviousStations(response.data.data);
        setSelectedHomeTimeZone(response.data.hometimeZone)
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <div>
        <Stack direction="row" spacing={5} mt={5}>
          <Typography variant="h6" style={{ fontSize: "18px" }}>Home timezone</Typography>
          <Stack style={{ "marginLeft": "45px" }}>
            <Select
              value={selectedHomeTimeZone}
              sx={{ height: '40px' }}
              onChange={handleTimeZoneChange}
            >
              {timezones.map((timezone, index) => (
                <MenuItem key={index} value={timezone}>
                  {timezone}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </Stack>
        <Stack mt={5} sx={{ alignItems: 'end' }}>
          <Table style={{ "overflow": "scroll" }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#F5F5F5" }}>
                <TableCell rowSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>S.no.</TableCell>
                <TableCell rowSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Station</TableCell>
                <TableCell rowSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>STD TZ</TableCell>
                <TableCell rowSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>DST TZ</TableCell>
                <TableCell rowSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Next DST Start</TableCell>
                <TableCell rowSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Next DST End</TableCell>
                <TableCell colSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Dom-Dom</TableCell>
                <TableCell colSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Dom-INTL</TableCell>
                <TableCell colSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>INTL-Dom</TableCell>
                <TableCell colSpan={2} sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>INTL-INTL</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: "#F5F5F5" }}>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Min CT</TableCell>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Max CT</TableCell>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Min CT</TableCell>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Max CT</TableCell>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Min CT</TableCell>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Max CT</TableCell>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Min CT</TableCell>
                <TableCell sx={{
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  padding: "0px",
                  textAlign: "center",
                  fontSize: "12px",
                }}>Max CT</TableCell>

              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => (
                <TableRow key={index} sx={{ backgroundColor: index % 2 !== 0 ? '#f0f0f0' : 'inherit' }}>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "14px",
                    textAlign: "center",
                  }}>{index + 1}</TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "14px",
                    textAlign: "center",
                  }}>{row.stationName}</TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    textAlign: "center",
                    // height: "50px"
                  }}>
                    <Select
                      value={row.stdtz}
                      size="small"
                      sx={{ height: "35px", fontSize: "14px" }}
                      onChange={(e) => handleInputChange(e, index, 'stdtz')}
                      displayEmpty
                      inputProps={{ 'aria-label': 'Select Timezone' }}
                    >
                      {timezones.map((timezone) => (
                        <MenuItem key={timezone} value={timezone}>
                          {timezone}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",
                  }}>
                    <Select
                      value={row.dsttz}
                      size="small"
                      sx={{ height: "35px", fontSize: "14px" }}
                      onChange={(e) => handleInputChange(e, index, 'dsttz')}
                      displayEmpty
                      inputProps={{ 'aria-label': 'Select Timezone' }}
                    >
                      {timezones.map((timezone) => (
                        <MenuItem key={timezone} value={timezone}>
                          {timezone}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",
                  }}>
                    {/* <TextField
                  size="small"
                  value={row.nextDSTStart}
                  onChange={(e) => handleInputChange(e, 'nextDSTStart')} // Add a function to handle input changes
                /> */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        size="small"
                        // label="Next DST Start"
                        value={dayjs(row.nextDSTStart)}
                        onChange={(date) => handleInputChange(date, index, "nextDSTStart")}
                        renderInput={(params) => <TextField {...params} />}
                        // Use slotProps to set the size of the input field
                        slotProps={{ textField: { size: "small" } }}
                        // Use sx to adjust the width and height of the input field and the calendar
                        sx={{
                          // Set the width of the input field
                          width: "135px",
                          // Target the input element inside the input field
                          "& .MuiInputBase-input": {
                            // Set the height of the input element
                            height: "18px",
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
                      />
                    </LocalizationProvider>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",
                  }}>
                    {/* <TextField
                  size="small"
                  value={row.nextDSTEnd}
                  onChange={(e) => handleInputChange(e, 'nextDSTEnd')} // Add a function to handle input changes
                /> */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        size="small"
                        // label="Next DST Start"
                        value={dayjs(row.nextDSTEnd)}
                        onChange={(date) => handleInputChange(date, index, "nextDSTEnd")}
                        renderInput={(params) => <TextField {...params} />}
                        // Use slotProps to set the size of the input field
                        slotProps={{ textField: { size: "small" } }}
                        // Use sx to adjust the width and height of the input field and the calendar
                        sx={{
                          // Set the width of the input field
                          width: "135px",
                          // Target the input element inside the input field
                          "& .MuiInputBase-input": {
                            // Set the height of the input element
                            height: "18px",
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
                      />
                    </LocalizationProvider>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",
                    position: 'relative',

                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px", fontSize:"14px" }}
                        value={row.ddMinCT}    
                        onChange={(e) => handleInputChange(e, index, 'ddMinCT')}
                        error={!isValidDDMinTime(row.ddMinCT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}

                      />
                      {!isValidDDMinTime(row.ddMinCT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 0:20 and 3:00)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",

                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px" }}
                        value={row.ddMaxCT}
                        onChange={(e) => handleInputChange(e, index, 'ddMaxCT')}
                        error={!isValidIIMaxTime(row.ddMaxCT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}
                      />
                      {!isValidIIMaxTime(row.ddMaxCT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 2:00 and 10:00)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",

                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px" }}
                        value={row.dInMinCT}
                        onChange={(e) => handleInputChange(e, index, 'dInMinCT')}
                        error={!isValidIIMinTime(row.dInMinCT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}

                      />
                      {!isValidIIMinTime(row.dInMinCT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 0:30 and 4:00)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",

                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px" }}
                        value={row.dInMaxCT}
                        onChange={(e) => handleInputChange(e, index, 'dInMaxCT')}
                        error={!isValidIIMaxTime(row.dInMaxCT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}

                      />
                      {!isValidIIMaxTime(row.dInMaxCT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 2:00 and 10:00)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",

                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px" }}
                        value={row.inDMinCT}
                        onChange={(e) => handleInputChange(e, index, 'inDMinCT')}
                        error={!isValidIIMinTime(row.inDMinCT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}

                      />
                      {!isValidIIMinTime(row.inDMinCT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 0:20 and 3:00)
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",

                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px" }}
                        value={row.inDMaxCT}
                        onChange={(e) => handleInputChange(e, index, 'inDMaxCT')}
                        error={!isValidIIMaxTime(row.inDMaxCT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}

                      />
                      {!isValidIIMaxTime(row.inDMaxCT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 2:00 and 10:00)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",

                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px" }}
                        value={row.inInMinDT}
                        onChange={(e) => handleInputChange(e, index, 'inInMinDT')}
                        error={!isValidIIMinTime(row.inInMinDT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}

                      />
                      {!isValidIIMinTime(row.inInMinDT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 0:30 and 4:00)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell sx={{
                    padding: "5px",
                    fontSize: "12px",
                    textAlign: "center",
                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <TextField
                        size="small"
                        sx={{ width: "65px" }}
                        value={row.inInMaxDT}
                        onChange={(e) => handleInputChange(e, index, 'inInMaxDT')}
                        error={!isValidIIMaxTime(row.inInMaxDT)}
                        inputProps={{ style: { padding: "10px", height:"15px", fontSize: "14px" } }}

                      />
                      {!isValidIIMaxTime(row.inInMaxDT) && (
                        <span style={{
                          color: 'red',
                          fontSize: '10px',
                        }}>
                          Enter a valid time (between 2:00 and 10:00)
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <LoadingButton
            variant="contained"
            sx={{ width: 100, marginTop: 3 }}
            onClick={saveStation}
            loading={isLoading}
          >
            Save
          </LoadingButton>

        </Stack>
      </div>
      <ToastContainer />
    </>
  );
};

export default StationsTable;
