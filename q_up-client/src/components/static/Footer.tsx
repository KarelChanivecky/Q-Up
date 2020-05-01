import React from "react";
import "../../styles/staticFooter.scss";
import { Grid } from "@material-ui/core";

export default function Footer() {
  return (
    <footer>
      <Grid container justify="center" alignItems="center" className="foot-container">
        <Grid item container direction="column" id="foot-content-grid">
            <Grid item container>
                <Grid item xs={3}><img src={require('../../img/twit.svg')} alt="Twitter logo"/></Grid>
                <Grid item xs={3}><img src={require('../../img/face.svg')} alt="Facebook logo"/></Grid>
                <Grid item xs={3}><img src={require('../../img/insta.png')} alt="Instagram logo"/></Grid>
                <Grid item xs={3}><img src={require('../../img/youtube.svg')} alt="Youtube logo"/></Grid>
            </Grid>
            <Grid item><hr/></Grid>
            <Grid item>
                <p>ABOUT US</p>
            </Grid>
            <Grid item><hr/></Grid>
            <Grid item>
                <p>CONTACT US</p>
            </Grid>
            <Grid item><hr/></Grid>
            <Grid item container justify="space-around" id="priv-terms-container">
                <Grid item xs={3}><p>PRIVACY</p></Grid>
                <Grid item xs={3}><p>TERMS OF USE</p></Grid>
            </Grid>
        </Grid>
      </Grid>
    </footer>
  );
}
