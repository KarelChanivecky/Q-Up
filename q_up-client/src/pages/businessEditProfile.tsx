import React, { useState, FormEvent, ChangeEvent, useEffect } from "react";
import Footer from "../components/static/Footer";
import Header from "../components/static/Header";
import { makeStyles } from "@material-ui/core/styles";
import {
  Grid,
  Typography,
  TextField,
  Button,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
} from "@material-ui/core";
import axios from "axios";
import { mockProvinces, mockCategories } from "src/mockData";
import "../styles/businessDashboard.scss";
import BusinessNav from "src/components/businessNav";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiTextField-root": {
      margin: theme.spacing(1),
      width: "25ch",
    },
  },
  pageTitle: {
    margin: "20px auto 20px auto",
  },
  textField: {
    margin: "20px auto 20px auto",
  },
  button: {
    margin: "20px auto 20px auto",
  },
  provSelect: {
    minWidth: "4.5rem",
  },
  catSelect: {
    minWidth: "10.5rem",
  },
}));

export default function EditBusinessProfilePage() {
  const classes = useStyles();
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${JSON.parse(sessionStorage.user).token}`,
    },
  };
  interface errors {
    hours?: {
      startTime?: string;
      endTime?: string;
    };
    category?: string;
    name?: string;
    email?: string;
    address?: {
      unit?: string;
      streetAddress?: string;
      city?: string;
      province?: string;
      postalCode?: string;
    };
    phoneNumber?: string;
    website?: string;
    averageWaitTime?: Number;
  }

  const errorObject: errors = {};

  const [formState, setFormState] = useState({
    category: "",
    description: "",
    email: "",
    hours: {
      startTime: [
        "00:00",
        "00:00",
        "00:00",
        "00:00",
        "00:00",
        "00:00",
        "00:00",
      ],
      endTime: ["00:01", "00:01", "00:01", "00:01", "00:01", "00:01", "00:01"],
    },
    address: {
      unit: "",
      streetAddress: "",
      city: "",
      province: "",
      postalCode: "",
    },
    name: "",
    phoneNumber: "",
    website: "",
    averageWaitTime: "",
    loading: false,
    errors: errorObject,
  });
  //

  const handleOnFieldChange = (event: any) => {
    const fieldNameTokens = event.target.name.split("-");
    const fieldCategory = fieldNameTokens[0];
    const name =
      fieldNameTokens.length !== 2 ? event.target.name : fieldNameTokens[1];
    const value = event.target.value;
    if (fieldCategory === "address") {
      setFormState((prevState) => ({
        ...prevState,
        address: { ...prevState.address, [name]: value },
      }));
    } else {
      setFormState((prevState) => ({ ...prevState, [name]: value }));
    }
  };

  const handleHourChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fieldNameTokens = event.target.name.split("-");
    const newValue = event.target.value;
    const timeType = fieldNameTokens[2];
    const weekdays = fieldNameTokens[1] === "weekday";
    const oldHours = formState.hours;
    const newHours = [""];
    if (weekdays) {
      for (let index = 1; index < 6; index++) {
        newHours[index] = newValue;
      }
      if (timeType === "startTime") {
        newHours[0] = oldHours.startTime[0];
        newHours[6] = oldHours.startTime[0];
      } else {
        newHours[0] = oldHours.endTime[0];
        newHours[6] = oldHours.endTime[0];
      }
      setFormState((prevState) => ({
        ...prevState,
        hours: { ...prevState.hours, [timeType]: newHours },
      }));
    } else {
      newHours[0] = newValue;
      newHours[6] = newValue;
      if (timeType === "startTime") {
        for (let index = 1; index < 6; index++) {
          newHours[index] = oldHours.startTime[1];
        }
      } else {
        for (let index = 1; index < 6; index++) {
          newHours[index] = oldHours.startTime[1];
        }
      }
      setFormState((prevState) => ({
        ...prevState,
        hours: { ...prevState.hours, [timeType]: newHours },
      }));
    }
  };

  const handleaverageWaitTImeChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.value;
    if (newValue === "") {
      setFormState((prevState) => ({
        ...prevState,
        averageWaitTime: newValue,
      }));
      return;
    }
    const newChar = newValue[newValue.length - 1];
    if (!("0" <= newChar && newChar <= "9")) {
      setFormState((prevState) => ({
        ...prevState,
        averageWaitTime: newValue.slice(0, -1),
      }));
      return;
    }
    const valueAsInt = parseInt(newValue);
    if (valueAsInt < 1) {
      setFormState((prevState) => ({ ...prevState, averageWaitTime: "1" }));
    } else if (valueAsInt > 59) {
      setFormState((prevState) => ({ ...prevState, averageWaitTime: "59" }));
    } else {
      setFormState((prevState) => ({
        ...prevState,
        averageWaitTime: newValue,
      }));
    }
  };

  const [getData, setGetData] = useState(true);

  useEffect(() => {
    if (!getData) {
      return;
    }
    setGetData(false);
    axios
      .get("/getBusiness", axiosConfig)
      .then((res: any) => {
        const data = res.data.businessData;
        setFormState({
          name: data.name,
          category: data.category,
          description: data.description,
          email: data.email,
          hours: data.hours,
          address: data.address,
          phoneNumber: data.phoneNumber,
          website: data.website,
          averageWaitTime: data.averageWaitTime,
          errors: {},
          loading: false,
        });
      })
      .catch((err: any) => {
        window.alert("Connection error");
        console.log(err);
      });
  }, [axiosConfig, errorObject, getData]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormState((prevState) => ({ ...prevState, loading: true }));
    const userData = {
      name: formState.name,
      phoneNumber: formState.phoneNumber,
      address: formState.address,
      category: formState.category,
      website: formState.website,
      hours: formState.hours,
      description: formState.description,
      email: formState.email,
      averageWaitTime: formState.averageWaitTime,
    };

    axios
      .put("/updateBusiness", userData, axiosConfig)
      .then(() => {
        console.log("success registering business");

        window.location.href = "/businessDashboard";
      })
      .catch((err: any) => {
        console.log("firebase lets you down, ", err);
        window.alert("Connection error");
        setFormState((prevState) => ({
          ...prevState,
          errors: err.response.data,
          loading: false,
        }));
      });
  };

  return (
    <>
      <Header Nav={BusinessNav} />
      <main>
        <form
          className={classes.root}
          autoComplete="off"
          onSubmit={handleSubmit}
        >
          <Grid
            container
            className="form"
            direction="column"
            justify="center"
            alignItems="center"
          >
            <Typography variant="h2" className={classes.pageTitle}>
              Your info
            </Typography>
            <TextField
              required
              color="secondary"
              id="name"
              label="Business name"
              name="name"
              onChange={handleOnFieldChange}
              value={formState.name}
              className={classes.textField}
              helperText={formState.errors.name}
              error={formState.errors.name ? true : false}
            />
            <TextField
              required
              color="secondary"
              id="phone"
              label="Phone number"
              name="phoneNumber"
              onChange={handleOnFieldChange}
              value={formState.phoneNumber}
              className={classes.textField}
              helperText={formState.errors.phoneNumber}
              error={formState.errors.phoneNumber ? true : false}
            />
            <TextField
              required
              color="secondary"
              id="email"
              label="Public email"
              name="email"
              onChange={handleOnFieldChange}
              value={formState.email}
              className={classes.textField}
              helperText={formState.errors.email}
              error={formState.errors.email ? true : false}
            />
            <TextField
              required
              color="secondary"
              id="website"
              label="Website"
              name="website"
              onChange={handleOnFieldChange}
              value={formState.website}
              className={classes.textField}
              helperText={formState.errors.website}
              error={formState.errors.website ? true : false}
            />
            <Grid item xs={12}>
              <FormControl className={classes.catSelect}>
                <InputLabel required color="secondary" id="category">
                  Business Category
                </InputLabel>
                <Select
                  color="secondary"
                  labelId="category-label"
                  id="category-select"
                  name="category"
                  value={formState.category}
                  onChange={handleOnFieldChange}
                >
                  {mockCategories().map((cat, key) => {
                    return (
                      <MenuItem key={key} value={cat}>
                        {cat}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            <br />

            <Grid container item justify="center">
              <Typography variant="h6" align="center">
                Address
              </Typography>
              <Grid item xs={12}>
                <TextField
                  color="secondary"
                  id="unit"
                  label="Unit"
                  name="address-unit"
                  onChange={handleOnFieldChange}
                  value={formState.address.unit}
                  className={classes.textField}
                  helperText={formState.errors.address?.unit}
                  error={formState.errors.address?.unit ? true : false}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  color="secondary"
                  id="streetAddress"
                  label="Street address"
                  name="address-streetAddress"
                  onChange={handleOnFieldChange}
                  value={formState.address.streetAddress}
                  className={classes.textField}
                  helperText={formState.errors.address?.streetAddress}
                  error={formState.errors.address?.streetAddress ? true : false}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  color="secondary"
                  id="City"
                  label="City"
                  name="address-city"
                  onChange={handleOnFieldChange}
                  value={formState.address.city}
                  className={classes.textField}
                  helperText={formState.errors.address?.city}
                  error={formState.errors.address?.city ? true : false}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl className={classes.provSelect}>
                  <InputLabel required color="secondary" id="province-label">
                    Prov.
                  </InputLabel>
                  <Select
                    color="secondary"
                    labelId="province-label"
                    id="province-select"
                    name="address-province"
                    value={formState.address.province}
                    onChange={handleOnFieldChange}
                  >
                    {mockProvinces().map((prov, key) => {
                      return (
                        <MenuItem key={key} value={prov}>
                          {prov}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                <Grid item xs={12}>
                  <TextField
                    color="secondary"
                    id="postalCode"
                    label="Postal Code"
                    name="address-postalCode"
                    onChange={handleOnFieldChange}
                    value={formState.address.postalCode}
                    className={classes.textField}
                    helperText={formState.errors.address?.postalCode}
                    error={formState.errors.address?.postalCode ? true : false}
                  />
                </Grid>
              </Grid>

              <Grid container item direction="column">
                <br />
                <Typography variant="h6">Operation hours</Typography>
                <br />
                <Typography variant="body1">Weekdays</Typography>
                <Grid container>
                  <Grid item xs={12}>
                    <TextField
                      color="secondary"
                      id="time"
                      label="Start time"
                      type="time"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        step: 900,
                      }}
                      name="hours-weekday-startTime"
                      onChange={handleHourChange}
                      value={formState.hours.startTime[1]}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      color="secondary"
                      id="time"
                      label="Close time"
                      type="time"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        step: 900,
                      }}
                      name="hours-weekday-endTime"
                      onChange={handleHourChange}
                      value={formState.hours.endTime[1]}
                    />
                  </Grid>
                </Grid>
                <Typography variant="body1">Weekends</Typography>
                <Grid container>
                  <Grid item xs={12}>
                    <TextField
                      color="secondary"
                      id="time"
                      label="Start time"
                      type="time"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        step: 900,
                      }}
                      name="hours-weekend-startTime"
                      onChange={handleHourChange}
                      value={formState.hours.startTime[0]}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      color="secondary"
                      id="time"
                      label="Close time"
                      type="time"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        step: 900,
                      }}
                      name="hours-weekend-endTime"
                      onChange={handleHourChange}
                      value={formState.hours.endTime[0]}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid container item direction="column">
                <br />
                <Typography variant="h6">
                  Estimated Serving Frequency(SF)
                </Typography>
                <Typography variant="caption">
                  Estimated Serving Frequency measures how often you can serve a
                  new frequency. This will be used to estimate wait times until
                  our app has sufficient data.
                </Typography>
                <Grid container item justify="center" alignItems="center">
                  <TextField
                    label="SF in Minutes"
                    name="servingFrequency"
                    color="secondary"
                    size="small"
                    onChange={handleaverageWaitTImeChange}
                    value={formState.averageWaitTime}
                  ></TextField>
                  <Typography variant="body1">minutes</Typography>
                </Grid>
              </Grid>
            </Grid>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              className={classes.button}
            >
              Submit
            </Button>
          </Grid>
        </form>
      </main>
      <Footer />
    </>
  );
}
