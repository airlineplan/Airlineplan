import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  MenuItem,
  TextField,
  Grid,
  Box,
  TableContainer,
  Paper,
  Typography,
  Button,
} from "@mui/material";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateField } from "@mui/x-date-pickers/DateField";
import { DashboardTableData } from "../../../assets/MockData/DashboardTableData";
import { ToastContainer, toast } from "react-toastify";
import PropTypes from 'prop-types';
import "react-toastify/dist/ReactToastify.css";
import './dashboard.css';
import dayjs from "dayjs";
import axios from "axios";
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { RotatingLines } from 'react-loader-spinner'


const MultiSelectDropdown = ({ placeholder, options, onChange }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);

  const handleDropdownChange = (selected) => {
    setSelectedOptions(selected);
    if (onChange) {
      onChange(selected);
    }
  };


  return (
    <div>
      <Select
        placeholder={placeholder}
        options={options}
        isMulti
        value={selectedOptions}
        onChange={handleDropdownChange}
      />
    </div>
  );
};


const SingleSelectDropdown = ({ placeholder, options, onChange, selected }) => {
  const [selectedOption, setSelectedOption] = useState(selected);

  const handleDropdownChange = (selected) => {
    setSelectedOption(selected);
    if (onChange) {
      onChange(selected);
    }
  };

  const customStyles = {
    control: (provided) => ({
      ...provided,
      width: "250px",
    }),
  };


  return (
    <Select
      options={options}
      value={selectedOption}
      onChange={handleDropdownChange}
      styles={customStyles}
      placeholder={placeholder}
    />
  );
};

const DashboardTable = () => {

  const singleSelectLabelOptions = [
    { label: "Dom", value: "dom" },
    { label: "INTL", value: "intl" },
    { label: "Both", value: "both" },
  ];

  const singleSelectPeriodicityOptions = [
    { label: "Annually", value: "annually" },
    { label: "Quarterly", value: "quarterly" },
    { label: "Monthly", value: "monthly" },
    { label: "Weekly", value: "weekly" },
    { label: "Daily", value: "daily" },
  ];


  const [from, setFrom] = useState([]);
  const [to, setTo] = useState([]);
  const [periodicity, setPeriodicity] = useState("");
  const [label, setLabel] = useState("");
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialConnectionCreated, setInitialConnectionCreated] = useState(false);
  const [selectedValues, setSelectedValues] = useState({ 'label': singleSelectLabelOptions[2], 'periodicity': singleSelectPeriodicityOptions[3] });
  const [singleSelectValues, setSingleSelectValues] = useState({
    label: null,
    periodicity: null,
  });
  const [multiSelectValues, setMultiSelectValues] = useState({
    from: [],
    to: [],
    sector: [],
    variant: [],
    userTag1: [],
    userTag2: [],
  });


  const transformData = () => {

    const propertyMappings = {
      destinations: 'Destinations',
      departures: 'Departures',
      seats: 'Seats',
      pax: 'Pax',
      paxSF: 'Pax SF',
      paxLF: 'Pax LF',
      cargoCapT: 'Cargo Ton Capacity',
      cargoT: 'Cargo Tons',
      ct2ctc: 'Cargo Tons/Cargo Ton Capacity',
      cftk2atk: 'Cargo FTK/Cargo ATK',
      bh: 'BH',
      waslgcd: 'Weighted average stage length per FLGT by GCD',
      waslbh: 'Weighted average stage length per FLGT by BH',
      adu: 'Average Daily Utilisation',
      connectingFlights: 'Connecting Flights',
      seatCapBeyondFlgts: 'Seat Capacity on Beyond Flights',
      seatCapBehindFlgts: 'Seat Capacity on Behind Flights',
      cargoCapBeyondFlgts: 'Cargo Capacity on Beyond Flights',
      cargoCapBehindFlgts: 'Cargo Capacity on Behind Flights',
      asks: 'ASKs (Mn)',
      rsks: 'RSKs (Mn)',
      cargoAtk: 'Cargo ATKs (Thousands)',
      cargoRtk: 'Cargo FTKs (Thousands)',
    };

    const properties = Object.keys(propertyMappings);
    const uniqueDates = Array.from(new Set(data.map(item => item.endDate)));

    var newData = [['']];

    // Function to format the date to "dd mmm yy" format
    function formatDate(inputDate) {
      var date = new Date(inputDate);
      var options = { year: '2-digit', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
    }

    // Iterate through uniqueDates and format them before pushing into newData array
    for (var i = 0; i < uniqueDates.length; i++) {
      var formattedDate = formatDate(uniqueDates[i]);
      newData[0].push(formattedDate);
    }

    // Pushing the dates as the first column in newData
    // newData.push(['', ...uniqueDates]);

    // Extracting properties from oldData and pushing them into newData
    properties.forEach(property => {
      newData.push([propertyMappings[property], ...uniqueDates.map(date => {
        const matchingData = data.find(item => item.endDate === date);

        switch (property) {
          case 'waslgcd':
            return (matchingData && matchingData.departures) ? (matchingData.sumOfGcd / matchingData.departures).toFixed(2) : '';
          case 'waslbh':
            return (matchingData && matchingData.departures) ? (matchingData.bh / matchingData.departures).toFixed(2) : '';
          case 'asks':
            return (matchingData) ? (matchingData.sumOfask / 1000000).toFixed(2) : '';
          case 'rsks':
            return (matchingData) ? (matchingData.sumOfrsk / 1000000).toFixed(2) : '';
          case 'cargoAtk':
            return (matchingData) ? (matchingData.sumOfcargoAtk / 1000).toFixed(2) : '';
          case 'cargoRtk':
            return (matchingData) ? (matchingData.sumOfcargoRtk / 1000).toFixed(2) : '';
          default:
            return matchingData ? matchingData[property] : '';
        }
      })]);
    });

    return newData;

  }

  const downloadDashboardTable = async () => {

    const newData = transformData();

    const transformedData = newData.map((row, rowIndex) => {
      // If it's the first row (index 0), leave the date values as strings
      if (rowIndex === 0) {
        return row;
      }
      // For other rows, convert numeric strings to numbers, leave other strings as they are
      return row.map((value, colIndex) => {
        // Skip the first column (index 0) which contains strings (dates)
        if (colIndex === 0) {
          return value;
        }
        const numValue = parseFloat((typeof value === 'string') ? parseFloat(value.replace(/,/g, '')) : value);
        return isNaN(numValue) ? value : numValue;
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(transformedData);

    // Set cell styles to center align the content
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: R };
        const cellRef = XLSX.utils.encode_cell(cellAddress);

        // Check if cell exists before applying styles
        if (ws[cellRef]) {
          ws[cellRef].s = {
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DashboardTable');

    // Save the Excel file
    XLSX.writeFile(wb, 'dashboard_table.xlsx');
  }

  const handleMultipleClicks = () => {
    props.runhandler();
  };

  const handlePeriodChange = (event) => {
    setPeriodicity(event.target.value);
  };

  const handleLabel = (event) => {
    setLabel(event.target.value);
  };


  const labelRef = useRef(label);

  const additionalTableCellsCount = data.length > 6 ? data.length - 6 : 0;

  useEffect(() => {
    labelRef.current = label;
  }, [label]);


  const fetchData = async (selected, fieldName) => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      setSelectedValues((prevSelectedValues) => ({
        ...prevSelectedValues,
        [fieldName]: selected,
      }));

      // Create the request payload with the selectedValues
      const requestData = {
        ...selectedValues,
        [fieldName]: selected, // Update the specific field in the payload
      };

      // const selectedOptions = collectSelectedOptions();


      const response = await axios.get(
        'https://airlineplan.com/dashboard',
        {
          params: requestData,
          headers: {
            'x-access-token': accessToken,
          },
        }
      );

      setData(response.data);
      console.log("data received in dashboard:", response.data);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false); // Set loading state to false after fetching data or encountering an error
    }
  };

  useEffect(() => {
    const createConnectionsAndFetchData = async () => {
      try {
        // Show loader
        setLoading(true);
  
        // Local flag to track connections creation status
        let connectionsCreated = initialConnectionCreated;
  
        // Check if initial connections have already been created
        if (!connectionsCreated) {
          const response = await axios.get(
            'https://airlineplan.com/createConnections',
            {
              headers: {
                'x-access-token': `${localStorage.getItem('accessToken')}`,
              },
            }
          );
  
          if (response.status === 200) {
            connectionsCreated = true; // Update local flag
            setInitialConnectionCreated(true); // Update state
          } else {
            toast.error(`Error creating connections. Status: ${response.status}`);
            return; // Exit early if connections fail
          }
        }
  
        // Fetch data only after connections are successfully created
        if (connectionsCreated) {
          await fetchData();
        }
      } catch (error) {
        // Handle errors for connection creation or fetching data
        toast.error(`Error: ${error.message}`);
      } finally {
        // Hide loader
        setLoading(false);
      }
    };
  
    // Trigger function if connections haven't been created or if periodicity/label changes
    createConnectionsAndFetchData();
  }, [periodicity, label, initialConnectionCreated]);
  

  useEffect(() => {

    const getDropdownData = async () => {

      const response = await axios.get(
        `https://airlineplan.com/dashboard/populateDropDowns`,
        {
          headers: {
            "x-access-token": `${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMultiSelectValues(response.data);
    }
    getDropdownData()

  }, []);

  return (
    <Stack direction="column" gap="1rem" my="16px">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mt="10px"
      >
        <SingleSelectDropdown
          placeholder="Label"
          options={singleSelectLabelOptions}
          onChange={(selected) => fetchData(selected, "label")}
          selected={singleSelectLabelOptions[2]}
        />
      </Stack>
      <Grid container spacing={2}>
        {/* You can adjust the spacing and other props as needed */}
        <Grid item xs={2}>
          <MultiSelectDropdown placeholder="From" options={multiSelectValues.from} onChange={(selected) => fetchData(selected, "from")} />
        </Grid>
        <Grid item xs={2}>
          <MultiSelectDropdown placeholder="To" options={multiSelectValues.to} onChange={(selected) => fetchData(selected, "to")} />
        </Grid>
        <Grid item xs={2}>
          <MultiSelectDropdown placeholder="Sector" options={multiSelectValues.sector} onChange={(selected) => fetchData(selected, "sector")} />
        </Grid>

        <Grid item xs={2}>
          <MultiSelectDropdown placeholder="Variant" options={multiSelectValues.variant} onChange={(selected) => fetchData(selected, "variant")} />
        </Grid>
        <Grid item xs={2}>
          <MultiSelectDropdown placeholder="User Tag 1" options={multiSelectValues.userTag1} onChange={(selected) => fetchData(selected, "userTag1")} />
        </Grid>
        <Grid item xs={2}>
          <MultiSelectDropdown placeholder="User Tag 2" options={multiSelectValues.userTag2} onChange={(selected) => fetchData(selected, "userTag2")} />
        </Grid>
      </Grid>
      <Stack direction="column" mt={5}>
        <Paper elevation={1} sx={{ height: "fit-content" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mt="10px"
          >
            {/* <TextField
              select
              label="Select Periodicity"
              onChange={fetchData}
              value={periodicity}
              size="small"
              sx={{ bgcolor: "white", width: "12rem" }}
            >
              <MenuItem value="annually">Annually</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField> */}

            <SingleSelectDropdown
              placeholder="Periodicity"
              options={singleSelectPeriodicityOptions}
              onChange={(selected) => fetchData(selected, "periodicity")}
              selected={singleSelectPeriodicityOptions[3]}
            />
          </Stack>

          <div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
                <RotatingLines
                  visible={loading}
                  height="96"
                  width="96"
                  color="grey"
                  strokeWidth="5"
                  strokeColor="#3399CC"
                  animationDuration="0.75"
                  ariaLabel="rotating-lines-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              </div>
            ) : (
              <TableContainer sx={{ overflowX: "scroll" }}>
                <Table
                  sx={{
                    border: "1px solid black",
                    borderCollapse: "collapse",
                    borderSpacing: "0",
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        {" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                          fontSize: "16px",
                          fontWeight: 600,
                        }}
                      >
                        {data && data[0]?.endDate
                          ? (() => {
                            const date = new Date(data[0]?.endDate);
                            if (!isNaN(date)) {
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                              const year = String(date.getFullYear()).slice(-2);
                              return `${day} ${month} ${year}`;
                            } else {
                              return " ---------           ";
                            }
                          })()
                          : " ---------           "}


                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                          fontSize: "16px",
                          fontWeight: 600,
                        }}
                      >
                        {data && data[1]?.endDate
                          ? (() => {
                            const date = new Date(data[1]?.endDate);
                            if (!isNaN(date)) {
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                              const year = String(date.getFullYear()).slice(-2);
                              return `${day} ${month} ${year}`;
                            } else {
                              return " ---------           ";
                            }
                          })()
                          : " ---------           "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                          fontSize: "16px",
                          fontWeight: 600,
                        }}
                      >
                        {data && data[2]?.endDate
                          ? (() => {
                            const date = new Date(data[2]?.endDate);
                            if (!isNaN(date)) {
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                              const year = String(date.getFullYear()).slice(-2);
                              return `${day} ${month} ${year}`;
                            } else {
                              return " ---------           ";
                            }
                          })()
                          : " ---------           "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                          fontSize: "16px",
                          fontWeight: 600,
                        }}
                      >
                        {data && data[3]?.endDate
                          ? (() => {
                            const date = new Date(data[3]?.endDate);
                            if (!isNaN(date)) {
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                              const year = String(date.getFullYear()).slice(-2);
                              return `${day} ${month} ${year}`;
                            } else {
                              return " ---------           ";
                            }
                          })()
                          : " ---------           "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                          fontSize: "16px",
                          fontWeight: 600,
                        }}
                      >
                        {data && data[4]?.endDate
                          ? (() => {
                            const date = new Date(data[4]?.endDate);
                            if (!isNaN(date)) {
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                              const year = String(date.getFullYear()).slice(-2);
                              return `${day} ${month} ${year}`;
                            } else {
                              return " ---------           ";
                            }
                          })()
                          : " ---------           "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                          fontSize: "16px",
                          fontWeight: 600,
                        }}
                      >
                        {data && data[5]?.endDate
                          ? (() => {
                            const date = new Date(data[5]?.endDate);
                            if (!isNaN(date)) {
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                              const year = String(date.getFullYear()).slice(-2);
                              return `${day} ${month} ${year}`;
                            } else {
                              return " ---------           ";
                            }
                          })()
                          : " ---------           "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const endDate = item?.endDate || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                                fontSize: "16px",
                                fontWeight: 600,
                              }}
                            >
                              {data && data[index + 6]?.endDate
                                ? (() => {
                                  const date = new Date(data[index + 6]?.endDate);
                                  if (!isNaN(date)) {
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
                                    const year = String(date.getFullYear()).slice(-2);
                                    return `${day} ${month} ${year}`;
                                  } else {
                                    return " ---------           ";
                                  }
                                })()
                                : " ---------           "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Destinations{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.destinations
                          ? data[0].destinations
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.destinations
                          ? data[1].destinations
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.destinations
                          ? data[2].destinations
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.destinations
                          ? data[3].destinations
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.destinations
                          ? data[4].destinations
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.destinations
                          ? data[5].destinations
                          : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const destinations = item?.destinations || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {destinations}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Departures
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.departures ? data[0].departures : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.departures ? data[1].departures : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.departures ? data[2].departures : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.departures ? data[3].departures : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.departures ? data[4].departures : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.departures ? data[5].departures : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const departures = item?.departures || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {departures ? departures : " ---------  "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Seats{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.seats ? data[0].seats : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.seats ? data[1].seats : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.seats ? data[2].seats : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.seats ? data[3].seats : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.seats ? data[4].seats : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.seats ? data[5].seats : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const seats = item?.seats || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {seats ? seats : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        {" "}
                        Pax
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.pax ? data[0].pax : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.pax ? data[1].pax : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.pax ? data[2].pax : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.pax ? data[3].pax : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.pax ? data[4].pax : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.pax ? data[5].pax : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const pax = item?.pax || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {pax ? pax : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Pax SF{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[0]?.paxLF == null) ? (isNaN(data[0]?.paxLF) ? "N/A" : data[0]?.paxLF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[0]
                            ? data[0]?.paxSF != null
                              ? isNaN(data[0]?.paxSF)
                                ? "N/A"
                                : data[0]?.paxSF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[1]?.paxSF == null)? (isNaN(data[1]?.paxSF) ? "N/A" : data[1]?.paxSF+ "%") : " "} */}

                        {
                          data && data.length > 0 && data[1]
                            ? data[1]?.paxSF != null
                              ? isNaN(data[1]?.paxSF)
                                ? "N/A"
                                : data[1]?.paxSF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[2]?.paxSF == null)? (isNaN(data[2]?.paxSF) ? "N/A" : data[2]?.paxSF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[2]
                            ? data[2]?.paxSF != null
                              ? isNaN(data[2]?.paxSF)
                                ? "N/A"
                                : data[2]?.paxSF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[3]?.paxSF == null)? (isNaN(data[3]?.paxSF) ? "N/A" : data[3]?.paxSF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[3]
                            ? data[3]?.paxSF != null
                              ? isNaN(data[3]?.paxSF)
                                ? "N/A"
                                : data[3]?.paxSF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[4]?.paxSF == null)? (isNaN(data[4]?.paxSF) ? "N/A" : data[4]?.paxSF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[4]
                            ? data[4]?.paxSF != null
                              ? isNaN(data[4]?.paxSF)
                                ? "N/A"
                                : data[4]?.paxSF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[5]?.paxSF == null)? (isNaN(data[5]?.paxSF) ? "N/A" : data[5]?.paxSF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[5]
                            ? data[5]?.paxSF != null
                              ? isNaN(data[5]?.paxSF)
                                ? "N/A"
                                : data[5]?.paxSF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const paxSF = (item?.paxSF == null || isNaN(item?.paxSF) ? "N/A" : item?.paxSF + "%"); // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {paxSF ? paxSF : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Pax LF{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[0]?.paxLF == null) ? (isNaN(data[0]?.paxLF) ? "N/A" : data[0]?.paxLF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[0]
                            ? data[0]?.paxLF != null
                              ? isNaN(data[0]?.paxLF)
                                ? "N/A"
                                : data[0]?.paxLF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[1]?.paxLF == null)? (isNaN(data[1]?.paxLF) ? "N/A" : data[1]?.paxLF+ "%") : " "} */}

                        {
                          data && data.length > 0 && data[1]
                            ? data[1]?.paxLF != null
                              ? isNaN(data[1]?.paxLF)
                                ? "N/A"
                                : data[1]?.paxLF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[2]?.paxLF == null)? (isNaN(data[2]?.paxLF) ? "N/A" : data[2]?.paxLF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[2]
                            ? data[2]?.paxLF != null
                              ? isNaN(data[2]?.paxLF)
                                ? "N/A"
                                : data[2]?.paxLF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[3]?.paxLF == null)? (isNaN(data[3]?.paxLF) ? "N/A" : data[3]?.paxLF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[3]
                            ? data[3]?.paxLF != null
                              ? isNaN(data[3]?.paxLF)
                                ? "N/A"
                                : data[3]?.paxLF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[4]?.paxLF == null)? (isNaN(data[4]?.paxLF) ? "N/A" : data[4]?.paxLF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[4]
                            ? data[4]?.paxLF != null
                              ? isNaN(data[4]?.paxLF)
                                ? "N/A"
                                : data[4]?.paxLF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {/* {data && data.length > 0 && !(data[5]?.paxLF == null)? (isNaN(data[5]?.paxLF) ? "N/A" : data[5]?.paxLF+ "%") : " "} */}
                        {
                          data && data.length > 0 && data[5]
                            ? data[5]?.paxLF != null
                              ? isNaN(data[5]?.paxLF)
                                ? "N/A"
                                : data[5]?.paxLF + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const paxLF = (item?.paxLF == null || isNaN(item?.paxLF) ? "N/A" : item?.paxLF + "%"); // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {paxLF ? paxLF : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo Ton Capacity{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.cargoCapT ? data[0].cargoCapT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.cargoCapT ? data[1].cargoCapT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.cargoCapT ? data[2].cargoCapT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.cargoCapT ? data[3].cargoCapT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.cargoCapT ? data[4].cargoCapT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.cargoCapT ? data[5].cargoCapT : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const cargoCapT = item?.cargoCapT || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {cargoCapT ? cargoCapT : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo Tons{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.cargoT ? data[0].cargoT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.cargoT ? data[1].cargoT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.cargoT ? data[2].cargoT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.cargoT ? data[3].cargoT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.cargoT ? data[4].cargoT : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.cargoT ? data[5].cargoT : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const cargoT = item?.cargoT || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {cargoT ? cargoT : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo Tons/Cargo Ton Capacity{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[0]
                            ? data[0]?.ct2ctc != null
                              ? isNaN(data[0]?.ct2ctc)
                                ? "N/A"
                                : data[0]?.ct2ctc + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[1]
                            ? data[1]?.ct2ctc != null
                              ? isNaN(data[1]?.ct2ctc)
                                ? "N/A"
                                : data[1]?.ct2ctc + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[2]
                            ? data[2]?.ct2ctc != null
                              ? isNaN(data[2]?.ct2ctc)
                                ? "N/A"
                                : data[2]?.ct2ctc + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[3]
                            ? data[3]?.ct2ctc != null
                              ? isNaN(data[3]?.ct2ctc)
                                ? "N/A"
                                : data[3]?.ct2ctc + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[4]
                            ? data[4]?.ct2ctc != null
                              ? isNaN(data[4]?.ct2ctc)
                                ? "N/A"
                                : data[4]?.ct2ctc + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[5]
                            ? data[5]?.ct2ctc != null
                              ? isNaN(data[5]?.ct2ctc)
                                ? "N/A"
                                : data[5]?.ct2ctc + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier
                          const ct2ctc = (item?.ct2ctc == null || isNaN(item?.ct2ctc) ? "N/A" : item?.ct2ctc + "%");
                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {ct2ctc}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo FTK/Cargo ATK{" "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[0]
                            ? data[0]?.cftk2atk != null
                              ? isNaN(data[0]?.cftk2atk)
                                ? "N/A"
                                : data[0]?.cftk2atk + "%"
                              : "N/A"
                            : " "
                        }                  </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[1]
                            ? data[1]?.cftk2atk != null
                              ? isNaN(data[1]?.cftk2atk)
                                ? "N/A"
                                : data[1]?.cftk2atk + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[2]
                            ? data[2]?.cftk2atk != null
                              ? isNaN(data[2]?.cftk2atk)
                                ? "N/A"
                                : data[2]?.cftk2atk + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[3]
                            ? data[3]?.cftk2atk != null
                              ? isNaN(data[3]?.cftk2atk)
                                ? "N/A"
                                : data[3]?.cftk2atk + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[4]
                            ? data[4]?.cftk2atk != null
                              ? isNaN(data[4]?.cftk2atk)
                                ? "N/A"
                                : data[4]?.cftk2atk + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {
                          data && data.length > 0 && data[5]
                            ? data[5]?.cftk2atk != null
                              ? isNaN(data[5]?.cftk2atk)
                                ? "N/A"
                                : data[5]?.cftk2atk + "%"
                              : "N/A"
                            : " "
                        }
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier
                          const cftk2atk = (item?.cftk2atk == null || isNaN(item?.cftk2atk) ? "N/A" : item?.cftk2atk + "%");
                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {cftk2atk}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        BH
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.bh ? data[0].bh : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.bh ? data[1].bh : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.bh ? data[2].bh : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.bh ? data[3].bh : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.bh ? data[4].bh : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.bh ? data[5].bh : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const bh = item?.bh || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {bh ? bh : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                        padding: "5px",
                      }}>
                        Weighted average stage length per FLGT</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        by GCD
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.departures
                          ? (parseFloat(data[0].sumOfGcd) / parseFloat(data[0].departures)).toLocaleString("en-US", { maximumFractionDigits: 0 })
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.departures
                          ? (parseFloat(data[1].sumOfGcd) / parseFloat(data[1].departures)).toLocaleString("en-US", { maximumFractionDigits: 0 })
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.departures
                          ? (parseFloat(data[2].sumOfGcd) / parseFloat(data[2].departures)).toLocaleString("en-US", { maximumFractionDigits: 0 })
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.departures
                          ? (parseFloat(data[3].sumOfGcd) / parseFloat(data[3].departures)).toLocaleString("en-US", { maximumFractionDigits: 0 })
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.departures
                          ? (parseFloat(data[4].sumOfGcd) / parseFloat(data[4].departures)).toLocaleString("en-US", { maximumFractionDigits: 0 })
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.departures
                          ? (parseFloat(data[5].sumOfGcd) / parseFloat(data[5].departures)).toLocaleString("en-US", { maximumFractionDigits: 0 })
                          : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const sumOfGcd = item?.sumOfGcd ?? " ";
                          const departures = item?.departures ?? " ";
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {sumOfGcd && departures ? (parseFloat(sumOfGcd) / parseFloat(departures)).toLocaleString("en-US", { maximumFractionDigits: 0 }) : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        by BH
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.departures
                          ? (data[0].bh / data[0].departures).toFixed(2)
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.departures
                          ? (data[1].bh / data[1].departures).toFixed(2)
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.departures
                          ? (data[2].bh / data[2].departures).toFixed(2)
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.departures
                          ? (data[3].bh / data[3].departures).toFixed(2)
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.departures
                          ? (data[4].bh / data[4].departures).toFixed(2)
                          : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.departures
                          ? (data[5].bh / data[5].departures).toFixed(2)
                          : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const bh = item?.bh ?? " ";
                          const departures = item?.departures ?? " ";
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {bh && departures ? (bh / departures).toFixed(2) : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Average Daily Utilisation
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.adu ? data[0].adu : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.adu ? data[1].adu : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.adu ? data[2].adu : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.adu ? data[3].adu : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.adu ? data[4].adu : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.adu ? data[5].adu : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const adu = item?.adu || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {adu ? adu : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Connecting Flights
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.connectingFlights ? data[0].connectingFlights : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.connectingFlights ? data[1].connectingFlights : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.connectingFlights ? data[2].connectingFlights : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.connectingFlights ? data[3].connectingFlights : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.connectingFlights ? data[4].connectingFlights : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.connectingFlights ? data[5].connectingFlights : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const connectingFlights = item?.connectingFlights || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {connectingFlights ? connectingFlights : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Seat Capacity on Beyond Flights
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.seatCapBeyondFlgts ? data[0].seatCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.seatCapBeyondFlgts ? data[1].seatCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.seatCapBeyondFlgts ? data[2].seatCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.seatCapBeyondFlgts ? data[3].seatCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.seatCapBeyondFlgts ? data[4].seatCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.seatCapBeyondFlgts ? data[5].seatCapBeyondFlgts : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const seatCapBeyondFlgts = item?.seatCapBeyondFlgts || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {seatCapBeyondFlgts ? seatCapBeyondFlgts : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Seat Capacity on Behind Flights
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.seatCapBehindFlgts ? data[0].seatCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.seatCapBehindFlgts ? data[1].seatCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.seatCapBehindFlgts ? data[2].seatCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.seatCapBehindFlgts ? data[3].seatCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.seatCapBehindFlgts ? data[4].seatCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.seatCapBehindFlgts ? data[5].seatCapBehindFlgts : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const seatCapBehindFlgts = item?.seatCapBehindFlgts || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {seatCapBehindFlgts ? seatCapBehindFlgts : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo Capacity on Beyond Flights
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.cargoCapBeyondFlgts ? data[0].cargoCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.cargoCapBeyondFlgts ? data[1].cargoCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.cargoCapBeyondFlgts ? data[2].cargoCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.cargoCapBeyondFlgts ? data[3].cargoCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.cargoCapBeyondFlgts ? data[4].cargoCapBeyondFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.cargoCapBeyondFlgts ? data[5].cargoCapBeyondFlgts : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const cargoCapBeyondFlgts = item?.cargoCapBeyondFlgts || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {cargoCapBeyondFlgts ? cargoCapBeyondFlgts : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo Capacity on Behind Flights
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.cargoCapBehindFlgts ? data[0].cargoCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.cargoCapBehindFlgts ? data[1].cargoCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.cargoCapBehindFlgts ? data[2].cargoCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.cargoCapBehindFlgts ? data[3].cargoCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.cargoCapBehindFlgts ? data[4].cargoCapBehindFlgts : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.cargoCapBehindFlgts ? data[5].cargoCapBehindFlgts : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const cargoCapBehindFlgts = item?.cargoCapBehindFlgts || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {cargoCapBehindFlgts ? cargoCapBehindFlgts : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        ASKs (Mn)
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.sumOfask ? (parseFloat(data[0].sumOfask) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.sumOfask ? (parseFloat(data[1].sumOfask) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.sumOfask ? (parseFloat(data[2].sumOfask) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.sumOfask ? (parseFloat(data[3].sumOfask) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.sumOfask ? (parseFloat(data[4].sumOfask) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.sumOfask ? (parseFloat(data[5].sumOfask) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const sumOfask = item?.sumOfask || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {sumOfask ? (parseFloat(sumOfask) / 1000000).toFixed(2) : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        RSKs (Mn)
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.sumOfrsk ? (parseFloat(data[0].sumOfrsk) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.sumOfrsk ? (parseFloat(data[1].sumOfrsk) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.sumOfrsk ? (parseFloat(data[2].sumOfrsk) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.sumOfrsk ? (parseFloat(data[3].sumOfrsk) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.sumOfrsk ? (parseFloat(data[4].sumOfrsk) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.sumOfrsk ? (parseFloat(data[5].sumOfrsk) / 1000000).toFixed(2) : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const sumOfrsk = item?.sumOfrsk || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {sumOfrsk ? (parseFloat(sumOfrsk) / 1000000).toFixed(2) : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo ATKs (Thousands)
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.sumOfcargoAtk ? (parseFloat(data[0].sumOfcargoAtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.sumOfcargoAtk ? (parseFloat(data[1].sumOfcargoAtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.sumOfcargoAtk ? (parseFloat(data[2].sumOfcargoAtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.sumOfcargoAtk ? (parseFloat(data[3].sumOfcargoAtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.sumOfcargoAtk ? (parseFloat(data[4].sumOfcargoAtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.sumOfcargoAtk ? (parseFloat(data[5].sumOfcargoAtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const sumOfcargoAtk = item?.sumOfcargoAtk || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {sumOfcargoAtk ? (parseFloat(sumOfcargoAtk) / 1000).toFixed(2) : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                    <TableRow>
                      <TableCell
                        sx={{
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          padding: "5px",
                        }}
                      >
                        Cargo FTKs (Thousands)
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[0]?.sumOfcargoRtk ? (parseFloat(data[0].sumOfcargoRtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[1]?.sumOfcargoRtk ? (parseFloat(data[1].sumOfcargoRtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[2]?.sumOfcargoRtk ? (parseFloat(data[2].sumOfcargoRtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[3]?.sumOfcargoRtk ? (parseFloat(data[3].sumOfcargoRtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[4]?.sumOfcargoRtk ? (parseFloat(data[4].sumOfcargoRtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "1px solid black",
                          whiteSpace: "nowrap",
                          padding: "5px",
                          textAlign: "center",
                        }}
                      >
                        {data && data[5]?.sumOfcargoRtk ? (parseFloat(data[5].sumOfcargoRtk) / 1000).toFixed(2) : " "}
                      </TableCell>
                      {Array.from({ length: additionalTableCellsCount }).map(
                        (_, index) => {
                          const item = data && data[index + 6]; // Ensure item is defined
                          const sumOfcargoRtk = item?.sumOfcargoRtk || " "; // Handle cases where destinations is not available
                          const key = index; // Use a unique identifier as the key, replace 'id' with your actual identifier

                          return (
                            <TableCell
                              key={key}
                              sx={{
                                border: "1px solid black",
                                whiteSpace: "nowrap",
                                padding: "5px",
                                textAlign: "center",
                              }}
                            >
                              {sumOfcargoRtk ? (parseFloat(sumOfcargoRtk) / 1000).toFixed(2) : " "}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

            )}
          </div>
        </Paper>
        <Stack direction="row" justifyContent="end">
          <Button
            variant="contained"
            sx={{ width: "fit-content", px: "20px", mt: "5px" }}
            onClick={downloadDashboardTable}
          >
            Download
          </Button>
        </Stack>
      </Stack>
      <ToastContainer />

    </Stack>
  );
};

DashboardTable.propTypes = {
  runhandler: PropTypes.func, // Expecting a function prop and it's required
};

export default DashboardTable;
