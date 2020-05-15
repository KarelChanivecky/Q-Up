import React from "react";
// import { useHistory } from "react-router-dom";
// import { Link } from 'react-router-dom';
// import QueueListRow from "../components/queueListRow";
import algoliasearch from "algoliasearch/lite";
import {
  InstantSearch,
  InfiniteHits,
  SearchBox,
  // Pagination,
  // ClearRefinements,
  // RefinementList,
  // Configure,
} from "react-instantsearch-dom";
import Footer from "../components/static/Footer";
import Header from "../components/static/Header";
import ConsumerNav from "../components/consumerNav";
// import { Typography } from "@material-ui/core";
// import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import QueueListRow from "src/components/queueListRow";

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
  customError: {
    color: "red",
    fontSize: "0.8em",
  },
  content: {
    margin: "10px",
  },
  businessImage: {
    width: "200px",
    height: "150px",
  },
}));

export default function QueueSearchPage() {
  const searchClient = algoliasearch(
    "EU7O4R6VOS",
    "86a00161b4b0e5a68907e099e5962273"
  );
  // const history = useHistory();
  const classes = useStyles();

  return (
    <>
      <Header Nav={ConsumerNav} />
      <div className="InstantSearch">
        <InstantSearch indexName="businesses" searchClient={searchClient}>
          <SearchBox
            translations={{
              placeholder: "Search for a queue",
            }}
          />
          <div className={classes.content}>
            <InfiniteHits hitComponent={QueueListRow} />
          </div>
        </InstantSearch>
      </div>
      <Footer />
    </>
  );
}
