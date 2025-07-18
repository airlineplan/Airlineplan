import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Typography,
  TextField,
  TableContainer,
  Button,
  Box,
  InputAdornment,
  Paper,
  IconButton,
  Pagination,
  CircularProgress
} from "@mui/material";
// import { FlgtsTableData } from '../../../assets/MockData/FlgtsTableData'
import moment from "moment";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DownloadIcon from "@mui/icons-material/Download";
import debounce from "lodash.debounce";

import "./CustomScrollbar.css";
import axios from "axios";
// const RowsPerPage = 10;
const label = { inputProps: { "aria-label": "Checkbox demo" } };

const FlgtsTable = ({ flightsData, isMaster = true }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [arrow, setArrow] = useState({ column: null, direction: "Up" });
  const [flgtsTableData, setFlgtsTableData] = useState([]);
  const [RowsPerPage, setRowsPerPage] = useState(10);
  const [totalFlights, setTotalFlights] = useState(0); // Total flights count
  // const [date, setDate] = useState("");
  // const [day, setDay] = useState("");
  // const [flight, setFlight] = useState("");
  // const [depStn, setDepStn] = useState("");
  // const [std, setStd] = useState("");
  // const [bt, setBt] = useState("");
  // const [sta, setSta] = useState("");
  // const [arrStn, setArrStn] = useState("");
  // const [sector, setSector] = useState("");
  // const [variant, setVariant] = useState("");
  // const [seats, setSeats] = useState("");
  // const [cargoCapT, setCargoCapT] = useState("");
  // const [dist, setDist] = useState("");
  // const [pax, setPax] = useState("");
  // const [cargoT, setCargoT] = useState("");
  // const [ask, setAsk] = useState("");
  // const [rsk, setRsk] = useState("");
  // const [cargoAtk, setCargoAtk] = useState("");
  // const [cargoRtk, setCargoRtk] = useState("");
  // const [domINTL, setDomIntl] = useState("");
  // const [userTag1, setUserTag1] = useState("");
  // const [userTag2, setUserTag2] = useState("");
  // const [remarks1, setRemarks1] = useState("");
  // const [remarks2, setRemarks2] = useState("");
  // const [rotationNumber, setRotationNumber] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [arrowDirection, setArrowDirection] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filters, setFilters] = useState({
    date: "",
    day: "",
    flight: "",
    depStn: "",
    std: "",
    bt: "",
    sta: "",
    arrStn: "",
    sector: "",
    variant: "",
    seats: "",
    cargoT: "",
    dist: "",
    pax: "",
    ask: "",
    rsk: "",
    cargoAtk: "",
    cargoRtk: "",
    domIntl: "",
    userTag1: "",
    userTag2: "",
    remarks1: "",
    remarks2: "",
    rotations: "",
  });

  const sortedData = useCallback(() => {
    if (!arrow.column) return flgtsTableData;

    return [...flgtsTableData].sort((a, b) => {
      const colA = a[arrow.column];
      const colB = b[arrow.column];

      if (arrow.direction === "Up") {
        return colA.localeCompare(colB);
      } else {
        return colB.localeCompare(colA);
      }
    });
  }, [arrow, flgtsTableData]);


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


  // const handleDate = (e) => {
  //   setDate(e.target.value);
  // };
  // const handleDay = (e) => {
  //   setDay(e.target.value);
  // };
  // const handleFlight = (event) => {
  //   setFlight(event.target.value);
  // };
  // const handleDepStn = (event) => {
  //   setDepStn(event.target.value);
  // };
  // const handleSTD = (event) => {
  //   setStd(event.target.value);
  // };
  // const handleBT = (event) => {
  //   setBt(event.target.value);
  // };
  // const handleSTA = (event) => {
  //   setSta(event.target.value);
  // };
  // const handleArrStn = (event) => {
  //   setArrStn(event.target.value);
  // };
  // const handleSector = (event) => {
  //   setSector(event.target.value);
  // };

  // const handleVariant = (event) => {
  //   setVariant(event.target.value);
  // };
  // const handleSeats = (event) => {
  //   setSeats(event.target.value);
  // };
  // const handleCargoT = (event) => {
  //   setCargoT(event.target.value);
  // };
  // const handleDist = (event) => {
  //   setDist(event.target.value);
  // };
  // const handlePax = (event) => {
  //   setPax(event.target.value);
  // };
  // const handleAsk = (event) => {
  //   setAsk(event.target.value);
  // };
  // const handleRsk = (event) => {
  //   setRsk(event.target.value);
  // };

  // const handleCargoAtk = (event) => {
  //   setCargoAtk(event.target.value);
  // };
  // const handleCargoRtk = (event) => {
  //   setCargoRtk(event.target.value);
  // };
  // const handleDomIntl = (event) => {
  //   setDomIntl(event.target.value.toLowerCase());
  // };
  // const handleUserTag1 = (event) => {
  //   setUserTag1(event.target.value);
  // };
  // const handleUserTag2 = (event) => {
  //   setUserTag2(event.target.value);
  // };
  // const handleRemarks1 = (event) => {
  //   setRemarks1(event.target.value);
  // };
  // const handleRemarks2 = (event) => {
  //   setRemarks2(event.target.value);
  // };

  // const handleRotations = (event) => {
  //   setRotationNumber(event.target.value);
  // };

  const handleFilterTextFieldChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const updatedFilters = { ...prev, [name]: value };
      if (!value) delete updatedFilters[name]; // Remove empty filters
      return updatedFilters;
    });
  };

  console.log("filters data raw : ", filters);

  const fetchResults = debounce(async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Access token is missing. Please log in again.");
      }

      // Filter out empty fields from the data
      const filteredData = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value)
      );

      // Ensure the filtered data is not empty
      // if (Object.keys(filteredData).length === 0) {
      //   return;
      // }

      console.log("filtered data after key remove: ", filteredData);

      // Make the POST request
      const requestBody = {
        ...filteredData,    // spread the existing filteredData properties
        page: currentPage,         // add the page value
        limit: RowsPerPage,       // add the limit value
      };

      const response = await axios.post(
        "http://localhost:3000/searchflights",
        requestBody,
        {
          headers: {
            "x-access-token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      setFlgtsTableData(response.data.data); // Update table data
      setTotalFlights(response.data.total); // Update total flights count

    } catch (error) {
      console.error("Error fetching flight data:", error);
    }
  }, 300); // Adjust debounce delay as needed (300ms here)

  // Trigger fetchResults whenever filters changes
  useEffect(() => {
    fetchResults();
  }, [filters, currentPage]);


  // const fetchFlightsData = async (page = 1, limit = 10) => {
  //   try {
  //     const accessToken = localStorage.getItem("accessToken");
  //     console.log("page : ", page + "limit : ", limit);
  //     const response = await axios.get(`http://localhost:3000/flight?page=${page}&limit=${limit}`, {
  //       headers: {
  //         "x-access-token": accessToken,
  //       },
  //     });

  //     setFlgtsTableData(response.data.data); // Update table data
  //     setTotalFlights(response.data.total); // Update total flights count
  //   } catch (error) {
  //     console.error("Error fetching data:", error);
  //   }
  // };


  useEffect(() => {
    fetchResults(currentPage, RowsPerPage);
  }, [currentPage, RowsPerPage]);


  const filteredData = useMemo(() => {
    return sortedData()?.map((row, index) => (
      <TableRow key={index} sx={{ backgroundColor: index % 2 !== 0 ? "#f0f0f0" : "inherit" }}>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {(currentPage - 1) * 10 + index + 1}
        </TableCell>
        <TableCell sx={{ whiteSpace: "nowrap", paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {moment(row.date).format("DD-MMM-YY")}
        </TableCell>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.day}
        </TableCell>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.flight}
        </TableCell>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.depStn}
        </TableCell>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.std}
        </TableCell>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.bt}
        </TableCell>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.sta}
        </TableCell>
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.arrStn}
        </TableCell>
        {isMaster && (
          <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
            {row.sector}
          </TableCell>
        )}
        <TableCell sx={{ paddingX: "0px", paddingY: "12px", fontSize: "12px", textAlign: "center" }}>
          {row.variant}
        </TableCell>
        {isMaster && (
          <>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {row.seats}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {parseFloat(row.CargoCapT).toFixed(1)}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {row.dist}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {parseInt(row?.pax)}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {parseFloat(row.CargoT).toFixed(1)}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {parseInt(row.ask)}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {parseInt(row.rsk)}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {parseInt(row.cargoAtk)}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {parseInt(row.cargoRtk)}
            </TableCell>
            <TableCell
              sx={{
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
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {row.userTag1}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {row.userTag2}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {row.remarks1}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {row.remarks2}
            </TableCell>
            <TableCell
              sx={{
                paddingX: "0px",
                paddingY: "12px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              {row.rotationNumber}
            </TableCell>
          </>
        )}
      </TableRow>
    ));
  }, [sortedData, currentPage]);


  console.log(flgtsTableData, "this is data");

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const startIndex = (currentPage - 1) * RowsPerPage;
  const endIndex = startIndex + RowsPerPage;

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const accessToken = localStorage.getItem("accessToken");

      const response = await axios.get("http://localhost:3000/downloadFLGTs", {
        responseType: "blob", // Specify response type as blob
        headers: {
          "x-access-token": accessToken,
        },
      });

      // Create a Blob object and create a URL for it
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger the download
      const a = document.createElement("a");
      a.href = url;
      a.download = "FLGTs.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloading(false);
    } catch (error) {
      console.error(error);
      setDownloading(false);
    }
  };

  return (
    <Stack gap={4}>
      {isMaster && (
        <Stack direction="row" alignItems="center" justifyContent="end" mt="15px">
          <Button
            variant="outlined"
            startIcon={downloading ? null : <DownloadIcon />}
            sx={{
              textTransform: "capitalize",
              color: "#4CAF50",
              bgcolor: "white",
              borderColor: "#4CAF50",
              "&:hover": {
                bgcolor: "#4CAF50",
                color: "white",
                borderColor: "#4CAF50",
              },
            }}
            onClick={handleDownload}
            disabled={downloading} // Disable the button when downloading
          >
            {downloading ? (
              <CircularProgress size={20} sx={{ color: "#4CAF50" }} /> // Show loader
            ) : (
              "Download"
            )}
          </Button>
        </Stack>
      )}
      <Stack
        sx={{ overflowX: "scroll", scrollbarWidth: "thin" }}
        className="custom-scrollbar"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ paddingX: "4px" }}>
                <Typography sx={{ fontWeight: "bold", fontSize: "14px" }}>
                  Filter:-
                </Typography>
              </TableCell>
              <TableCell sx={{ paddingX: "4px" }}>
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Date"
                  onChange={handleFilterTextFieldChange}
                  value={filters.date}
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
                  value={filters.day}
                  onChange={handleFilterTextFieldChange}
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
                  placeholder="Flight #"
                  value={filters.flight}
                  name="flight"
                  onChange={handleFilterTextFieldChange}
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
                  placeholder="Dep Stn"
                  name="depStn"
                  value={filters.depStn}
                  onChange={handleFilterTextFieldChange}
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
                  placeholder="STD(LT)"
                  value={filters.std}
                  name="std"
                  onChange={handleFilterTextFieldChange}
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
                  placeholder="BT"
                  value={filters.bt}
                  name="bt"
                  onChange={handleFilterTextFieldChange}
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
                  placeholder="STA(LT)"
                  value={filters.sta}
                  name="sta"
                  onChange={handleFilterTextFieldChange}
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
                  placeholder="Arr Stn"
                  value={filters.arrStn}
                  name="arrStn"
                  onChange={handleFilterTextFieldChange}
                  sx={{
                    minWidth: "10px",
                    fontSize: "10px",
                    "& .MuiOutlinedInput-input": { fontSize: "12px" },
                  }}
                />
              </TableCell>
              {isMaster && (
                <TableCell sx={{ paddingX: "4px" }}>
                  <TextField
                    variant="outlined"
                    size="small"
                    placeholder="Sector"
                    value={filters.sector}
                    name="sector"
                    onChange={handleFilterTextFieldChange}
                    sx={{
                      minWidth: "10px",
                      fontSize: "10px",
                      "& .MuiOutlinedInput-input": { fontSize: "12px" },
                    }}
                  />
                </TableCell>
              )}
              <TableCell sx={{ paddingX: "4px" }}>
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Variant"
                  name="variant"
                  value={filters.variant}
                  onChange={handleFilterTextFieldChange}
                  sx={{
                    minWidth: "10px",
                    fontSize: "10px",
                    "& .MuiOutlinedInput-input": { fontSize: "12px" },
                  }}
                />
              </TableCell>
              {isMaster && (
                <>
                  <TableCell sx={{ paddingX: "4px" }}>
                    <TextField
                      variant="outlined"
                      size="small"
                      placeholder="Seats"
                      name="seats"
                      value={filters.seats}
                      onChange={handleFilterTextFieldChange}
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
                      placeholder="Cargo Cap"
                      name="cargoT"
                      value={filters.cargoT}
                      onChange={handleFilterTextFieldChange}
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
                      placeholder="Dist"
                      name="dist"
                      value={filters.dist}
                      onChange={handleFilterTextFieldChange}
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
                      placeholder="Pax"
                      value={filters.pax}
                      name="pax"
                      onChange={handleFilterTextFieldChange}
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
                      placeholder="Cargo T"
                      name="cargoT"
                      value={filters.cargoT}
                      onChange={handleFilterTextFieldChange}
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
                      placeholder="ASK"
                      name="ask"
                      value={filters.ask}
                      onChange={handleFilterTextFieldChange}
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
                      placeholder="RSK"
                      name="rsk"
                      value={filters.rsk}
                      onChange={handleFilterTextFieldChange}
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
                      name="cargoAtk"
                      placeholder="Cargo ATK"
                      value={filters.cargoAtk}
                      onChange={handleFilterTextFieldChange}
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
                      name="cargoRtk"
                      placeholder="Cargo RTK"
                      value={filters.cargoRtk}
                      onChange={handleFilterTextFieldChange}
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
                      name="domIntl"
                      placeholder="Dom / INTL"
                      value={filters.domIntl}
                      onChange={handleFilterTextFieldChange}
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
                      name="userTag1"
                      placeholder="User Tag 1"
                      value={filters.userTag1}
                      onChange={handleFilterTextFieldChange}
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
                      placeholder="User Tag 2"
                      name="userTag2"
                      value={filters.userTag2}
                      onChange={handleFilterTextFieldChange}
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
                      name="remarks1"
                      placeholder="Remarks1"
                      value={filters.remarks1}
                      onChange={handleFilterTextFieldChange}
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
                      name="remarks2"
                      placeholder="Remarks2"
                      value={filters.remarks2}
                      onChange={handleFilterTextFieldChange}
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
                      name="rotations"
                      placeholder="Rotation #"
                      value={filters.rotations}
                      onChange={handleFilterTextFieldChange}
                      sx={{
                        minWidth: "10px",
                        fontSize: "10px",
                        "& .MuiOutlinedInput-input": { fontSize: "12px" },
                      }}
                    />
                  </TableCell>
                </>)}
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
              {isMaster && (
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
                  Sector
                  <IconButton
                    onClick={() => {
                      handleArrow("sector");
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
              )}
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
              {isMaster && (
                <>
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
                    Seats
                    <IconButton
                      onClick={() => {
                        handleArrow("seats");
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
                    Cargo Cap
                    <IconButton
                      onClick={() => {
                        handleArrow("cargoCapT");
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
                    Dist
                    <IconButton
                      onClick={() => {
                        handleArrow("dist");
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
                    Pax
                    <IconButton
                      onClick={() => {
                        handleArrow("pax");
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
                    Cargo T
                    <IconButton
                      onClick={() => {
                        handleArrow("cargoT");
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
                    ASK
                    <IconButton
                      onClick={() => {
                        handleArrow("ask");
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
                    RSK
                    <IconButton
                      onClick={() => {
                        handleArrow("rsk");
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
                    Cargo ATK
                    <IconButton
                      onClick={() => {
                        handleArrow("cargoAtk");
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
                    Cargo RTK
                    <IconButton
                      onClick={() => {
                        handleArrow("cargoRtk");
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
                    Dom / INTL
                    <IconButton
                      onClick={() => {
                        handleArrow("domINTL");
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
                    User Tag 1
                    <IconButton
                      onClick={() => {
                        handleArrow("userTag1");
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
                    User Tag 2
                    <IconButton
                      onClick={() => {
                        handleArrow("userTag2");
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
                    Remarks 1
                    <IconButton
                      onClick={() => {
                        handleArrow("remarks1");
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
                    Remarks 2
                    <IconButton
                      onClick={() => {
                        handleArrow("remarks2");
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
                    Rotation #
                    <IconButton
                      onClick={() => {
                        handleArrow("Rotations #");
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
                </>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* {sortedData()
              ?.filter(
                (row) =>
                  (row.flight || "")
                    ?.toLowerCase()
                    .includes(flight?.toLowerCase()) &&
                  (row.depStn || "")
                    ?.toLowerCase()
                    ?.includes(depStn?.toLowerCase()) &&
                  (row.std || "")
                    ?.toLowerCase()
                    ?.includes(std?.toLowerCase()) &&
                  (row.bt || "")?.toLowerCase()?.includes(bt?.toLowerCase()) &&
                  (row.sta || "")
                    ?.toLowerCase()
                    ?.includes(sta?.toLowerCase()) &&
                  (row.arrStn || "")
                    ?.toLowerCase()
                    ?.includes(arrStn?.toLowerCase()) &&
                  (row.variant || "")
                    ?.toLowerCase()
                    ?.includes(variant?.toLowerCase()) &&
                  (moment(row.date).format("DD-MMM-YY") || "")
                    ?.toLowerCase()
                    ?.includes(date?.toLowerCase()) &&
                  (row.day || "")
                    ?.toLowerCase()
                    ?.includes(day?.toLowerCase())
              )
              // .slice(startIndex, endIndex)

              ?.map((row, index) => (
                <TableRow key={index} sx={{ backgroundColor: index % 2 !== 0 ? '#f0f0f0' : 'inherit' }}>
                  <TableCell
                    sx={{
                      paddingX: "0px",
                      paddingY: "12px",
                      fontSize: "12px",
                      textAlign: "center",
                    }}
                  >
                    {(currentPage - 1) * 10 + index + 1}
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
                  {isMaster && (
                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                        paddingX: "0px",
                        paddingY: "12px",
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      {row.sector}
                    </TableCell>
                  )}
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
                  {isMaster && (
                    <>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.seats}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {parseFloat(row.CargoCapT).toFixed(1)}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.dist}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {parseInt(row?.pax)}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {parseFloat(row.CargoT).toFixed(1)}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {parseInt(row.ask)}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {parseInt(row.rsk)}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {parseInt(row.cargoAtk)}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {parseInt(row.cargoRtk)}
                      </TableCell>
                      <TableCell
                        sx={{
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
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.userTag1}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.userTag2}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.remarks1}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.remarks2}
                      </TableCell>
                      <TableCell
                        sx={{
                          paddingX: "0px",
                          paddingY: "12px",
                          fontSize: "12px",
                          textAlign: "center",
                        }}
                      >
                        {row.rotationNumber}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))} */}
            {filteredData}
          </TableBody>
        </Table>
      </Stack>
      <Stack direction="row" justifyContent="end">
        <Pagination
          count={Math.ceil(totalFlights / RowsPerPage)} // Total pages
          page={currentPage} // Current page
          onChange={handlePageChange} // Page change handler
          color="primary"
        />
      </Stack>
    </Stack>
  );
};

export default FlgtsTable;
