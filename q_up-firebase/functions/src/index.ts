import * as functions from "firebase-functions";
import { getQueue, getQueueSlotInfo, customerEnterQueue, vipEnterQueue, abandonQueueSlot, changeQueueStatus,
    getFavouriteQueuesForCustomer, changeStatusOfFavouriteBusiness } from "./controllers/queues";
import {boothEnterQueue, createNewBooth} from "./controllers/booths";
import * as express from "express";
import * as cors from "cors";
import {signUp, login, changePassword, logout} from "./controllers/users";
import { updateCustomerInfo, deleteCustomer, getCustomer, registerCustomer } from "./controllers/customers";
import { updateBusiness, uploadBusinessImage, getBusiness, registerBusiness, deleteBusiness } from "./controllers/businesses";
import {FirebaseAuthentication} from "./util/firebaseAuthentication";
import algoliasearch from "algoliasearch";
import { checkInQueue, registerEmployee, deleteEmployee, getListOfAllEmployees, getOnlineEmployees, updateEmployee} from "./controllers/employees";

// ========================
// App Configuration
// ========================
const app = express();
app.use(cors());
const APP_ID = functions.config().algolia.app;
const ADMIN_KEY = functions.config().algolia.key;
const client = algoliasearch(APP_ID, ADMIN_KEY);
const index = client.initIndex("businesses");

// ===========================================================================
// all routes start with https://us-central1-q-up-c2b70.cloudfunctions.net/api
// ===========================================================================


// ========================
// Authentication Routes
// ========================
app.post("/signup", signUp);
app.post("/login", login);
app.get('/logout', FirebaseAuthentication, logout);
app.put("/changePassword", FirebaseAuthentication, changePassword);


// ========================
// Business Routes
// ========================
app.post('/registerBusiness', FirebaseAuthentication, registerBusiness);
app.post("/uploadBusinessImage", FirebaseAuthentication, uploadBusinessImage);
app.get("/getBusiness", FirebaseAuthentication, getBusiness);
app.put("/updateBusiness", FirebaseAuthentication, updateBusiness);
app.delete('/deleteBusiness', FirebaseAuthentication, deleteBusiness);


// ========================
// Customer Routes
// ========================
app.get("/getCustomer", FirebaseAuthentication, getCustomer);
app.post('/registerCustomer', FirebaseAuthentication, registerCustomer);
app.put("/updateCustomer", FirebaseAuthentication, updateCustomerInfo);
app.delete("/deleteCustomer", FirebaseAuthentication, deleteCustomer);


// ========================
// Employee Routes
// ========================
app.post('/registerEmployee', FirebaseAuthentication, registerEmployee);
app.put('/updateEmployee', FirebaseAuthentication, updateEmployee);
app.delete('/deleteEmployee', FirebaseAuthentication, deleteEmployee);
app.post('/checkInQueue', FirebaseAuthentication, checkInQueue);
app.get('/getListOfAllEmployees', FirebaseAuthentication, getListOfAllEmployees);
app.get('/getOnlineEmployees', FirebaseAuthentication, getOnlineEmployees);


// ========================
// Queue Routes
// ========================
app.get("/getQueue", FirebaseAuthentication, getQueue);
app.get("/getCustomerQueueInfo", FirebaseAuthentication, getQueueSlotInfo);
app.post("/customerEnterQueue", FirebaseAuthentication, customerEnterQueue);
app.post("/VIPEnterQueue", FirebaseAuthentication, vipEnterQueue);
app.put("/abandonQueueSlot", FirebaseAuthentication, abandonQueueSlot);
app.put("/changeQueueStatus", FirebaseAuthentication, changeQueueStatus);
app.get("/getFavouriteQueues", FirebaseAuthentication, getFavouriteQueuesForCustomer);
app.put('/changeFavoriteQueueStatus',FirebaseAuthentication, changeStatusOfFavouriteBusiness);

// ========================
// Booth Routes
// ========================
app.post("/boothEnterQueue", FirebaseAuthentication, boothEnterQueue);
app.post("/createNewBooth", FirebaseAuthentication, createNewBooth);


// ========================
// Algolia exports
// ========================
exports.addToIndex = functions.firestore.document("businesses/{businessId}").onCreate((snapshot) => {
        const data = snapshot.data();
        const objectID = snapshot.id;
        return index.saveObject({...data, objectID});
    });
exports.updateIndex = functions.firestore.document("businesses/{businessId}").onUpdate((change) => {
        const newData = change.after.data();
        const objectID = change.after.id;
        return index.saveObject({...newData, objectID});
    });
exports.deleteFromIndex = functions.firestore.document("businesses/{businessId}").onDelete((snapshot) => {
        index.deleteObject(snapshot.id);
    });


exports.api = functions.https.onRequest(app);
