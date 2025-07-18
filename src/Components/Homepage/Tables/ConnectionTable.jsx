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

import { ToastContainer, toast } from "react-toastify";
import PropTypes from 'prop-types';
import axios from "axios";
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

const ConnectionTable = () => {
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

    const labelRef = useRef(label);

    const additionalTableCellsCount = data.length > 6 ? data.length - 6 : 0;

    useEffect(() => {
        labelRef.current = label;
    }, [label]);


    const fetchData = async (selected = null, fieldName = null) => {
        try {
            setLoading(true); // Show loader
            const accessToken = localStorage.getItem("accessToken");

            // Update selected values if parameters are passed
            let updatedValues = { ...selectedValues };
            if (selected && fieldName) {
                updatedValues = { ...selectedValues, [fieldName]: selected };
                setSelectedValues(updatedValues); // Update state
            }

            // Call the dashboard API
            const response = await axios.get('http://localhost:3000/fetchConnectionsData', {
                params: updatedValues,
                headers: {
                    'x-access-token': accessToken,
                },
            });

            // Set the received data
            setData(response.data);
            console.log("Data received in connections page:", response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false); // Hide loader
        }
    };

    useEffect(() => {

        // Trigger function if connections haven't been created or periodicity/label changes
        fetchData();
    }, [periodicity, label]);



    useEffect(() => {

        const getDropdownData = async () => {

            const response = await axios.get(
                `http://localhost:3000/dashboard/populateDropDowns`,
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
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </div>
                </Paper>
            </Stack>
            <ToastContainer />

        </Stack>
    );
}

ConnectionTable.propTypes = {
    runhandler: PropTypes.func,
};

export default ConnectionTable;