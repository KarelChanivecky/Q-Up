import {db,} from "../util/firebaseConfig";
import {Request, Response,} from "express";
import * as firebase from "firebase-admin";
import * as moment from "moment-timezone";
import {
    createQueueSlot,
    createVIPSlotCredentials,
    getTheDayOfTheWeekForArray,
} from "../util/helpers";

/**
 * Gets the number of online Employees for the business.
 * first queries the list of all employees in the business, then counts the number of online ones and returns it.
 *
 * @param businessName:      a string
 * @returns                 number -1 if no results found otherwise the number of online employees in the business
 */
const getOnlineEmployees = async (businessName: string) => {
    return await db
        .collection("users")
        .where("userType", "==", "employee")
        .where("businessName", "==", businessName)
        .get()
        .then((dataList) => {
            if (dataList.empty) {
                return -1;
            }
            let onlineEmployeeCount: number = 0;
            dataList.docs.forEach((data) => {
                if (data.data().isOnline) {
                    onlineEmployeeCount++;
                }
            });
            return onlineEmployeeCount;
        })
        .catch((err) => {
            console.error(err);
            return -1;
        });
};

/**
 * gets the queue information.
 * first, checks if the user is a employee or manager, then checks if the or manager employee belongs to the business,
 * then gets the list of
 * queue slots information.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 401 if the user is not of type employee or manager
 *                  - 404 if employee is not part of the business
 *                  - 404 if can not find the number of online employees
 *                  - 500 if an error occurs in the midst of the query
 *                  - 200 if successful
 */
export const getQueue = async (req: Request, res: Response) => {
    const requestData = {
        userEmail: req.body.userEmail,
        userType: req.body.userType,
        businessName: req.body.businessName,
    };
    if (requestData.userType !== "employee" && requestData.userType !== "manager") {
        return res.status(401).json({general: "unauthorized. Login as an employee or manager of the business!"});
    }
    if (requestData.userType === 'employee') {
        const isEmployeeOfBusiness: boolean = await db
            .collection("users")
            .where("email", "==", requestData.userEmail)
            .get()
            .then((data) => data.docs[0].data().businessName === requestData.businessName)
            .catch((err) => {
                console.error(err);
                return false;
            });
        if (!isEmployeeOfBusiness) {
            return res.status(404).json({general: "employee is not part of the business!"});
        }
    }
    return await db
        .collection("businesses")
        .where("name", "==", requestData.businessName)
        .get()
        .then(async (data) => {
            const queue: any = data.docs[0].data().queue;
            const onlineEmployees: number = await getOnlineEmployees(requestData.businessName);
            if (onlineEmployees === -1) {
                return res.status(404).json({
                    general: "did not obtain the number of online employees",
                });
            }
            return res.status(200).json({
                general: "obtained the queue information successfully!",
                queue: {
                    queueList: queue.queueSlots,
                    isActive: queue.isActive,
                    currentWaitTime: (queue.queueSlots.length * queue.averageWaitTime) / onlineEmployees,
                    queueLength: queue.queueSlots.length,
                },
            });
        })
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

/**
 * Gets the customers' Queue Slot information.
 * first, checks if the user is a customer, then gets queue status and finds the Queue Slot and returns it from the
 * database.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 401 if the user is not of type customer
 *                  - 404 if Queue is no longer active
 *                  - 404 if customer is not in a queue
 *                  - 404 if can not find the customer position.
 *                  - 500 if an error occurs in the midst of the query
 *                  - 200 if successful
 */
export const getQueueSlotInfo = async (req: Request, res: Response) => {
    const requestData = {
        userType: req.body.userType,
        userEmail: req.body.userEmail,
        currentQueue: req.body.currentQueue,
    };
    if (requestData.userType !== "customer") {
        return res.status(401).json({general: "unauthorized. Login as a customer!"});
    }
    if (requestData.currentQueue === null) {
        return res.status(404).json({general: "You are not in a queue"});
    }
    return await db
        .collection("businesses")
        .where("name", "==", requestData.currentQueue)
        .get()
        .then(async (data) => {
            const queue: any = data.docs[0].data().queue;
            if (!queue.isActive) {
                db
                    .collection("users")
                    .doc(requestData.userEmail)
                    .update({currentQueue: null});
                return res.status(404).json({
                    general: "the queue is no longer active!",
                });
            }
            const queueSlots = queue.queueSlots;
            const queueSlotIndex: number = queueSlots.findIndex((queueSlot: any) => {
                return queueSlot.customer === requestData.userEmail;
            });
            if (queueSlotIndex === -1) {
                return res.status(404).json({general: "could not find the customer position."});
            }
            const onlineEmployees: number = await getOnlineEmployees(requestData.currentQueue);
            return res.status(200).json({
                general: "obtained the customer's current queue information successfully",
                queueSlotInfo: {
                    ticketNumber: queueSlots[queueSlotIndex].ticketNumber,
                    password: queueSlots[queueSlotIndex].password,
                    currentWaitTime: (queueSlotIndex * queue.averageWaitTime) / onlineEmployees,
                    queuePosition: queueSlotIndex + 1,
                },
            });
        })
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

/**
 * Adds a logged in customer to a queue.
 * first, checks the userType to be a customer then, updates the queues collection by adding the new queueSlot,
 * then updates the current queue of the customer.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 401 if the user is not of type customer
 *                  - 404 if Queue is currently not active
 *                  - 403 if customer already in a queue
 *                  - 500 if an error occurs in the midst of the query
 *                  - 201 if successful
 */
export const customerEnterQueue = async (req: Request, res: Response) => {
    const requestData = {
        userEmail: req.body.userEmail,
        userType: req.body.userType,
        currentQueue: req.body.currentQueue,
        queueName: req.body.queueName,
    };
    if (requestData.userType !== "customer") {
        return res.status(401).json({general: "unauthorized. Login as a customer!"});
    }
    if (requestData.currentQueue !== null) {
        return res.status(403).json({general: "You are already enrolled in a queue!"});
    }
    return await db
        .collection("businesses")
        .where("name", "==", requestData.queueName)
        .get()
        .then(async (data) => {
            const queue: any = data.docs[0].data().queue;
            let queueSlots: Array<any> = queue.queueSlots;
            if (queue.isActive) {
                const customer = createQueueSlot(requestData.userEmail, 0);
                if (queueSlots.length > 0) {
                    customer.ticketNumber =
                        queueSlots[queueSlots.length - 1].ticketNumber + 1;
                }
                queueSlots.push(customer);
                queue.queueSlots = queueSlots;
                await db
                    .collection("businesses")
                    .doc(requestData.queueName)
                    .update({queue: queue});
                await db
                    .collection("users")
                    .doc(requestData.userEmail)
                    .update({currentQueue: requestData.queueName});
                return res.status(201).json({
                    general: `${requestData.userEmail} has been added into queue ${requestData.queueName} successfully`
                });
            } else {
                return res.status(404).json({general: "Queue is currently not active"});
            }
        })
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

/**
 * Removes customers' from their queued-in Queue.
 * first, checks if the user is a customer, removes the customers queue slot from the queues queueSlot array, finally,
 * removes the currentQueue of the customer.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 401 if the user is not of type customer
 *                  - 403 if the user is not in a queue
 *                  - 404 if customer not in a queue
 *                  - 500 if an error occurs in the midst of the query
 *                  - 202 if successful
 */
export const abandonQueueSlot = async (req: Request, res: Response) => {
    const requestData = {
        currentQueue: req.body.currentQueue,
        userEmail: req.body.userEmail,
        userType: req.body.userType,
    };
    if (requestData.userType !== "customer") {
        return res.status(401).json({general: "unauthorized. Login as a customer!"});
    }
    if (requestData.currentQueue === null) {
        return res.status(403).json({general: "You are not currently in a queue"});
    }
    return await db
        .collection("businesses")
        .where("name", "==", requestData.currentQueue)
        .get()
        .then((data) => {
            const queue: any = data.docs[0].data().queue;
            let queueSlots: Array<any> = queue.queueSlots;
            const queueSlotIndex: number = queueSlots.findIndex((queueSlot: any) => {
                return queueSlot.customer === requestData.userEmail;
            });
            if (queueSlotIndex === -1) {
                return res.status(404).json({general: "could not find the customer position."});
            }
            queueSlots.splice(queueSlotIndex, 1);
            queue.queueSlots = queueSlots;
            db.collection("businesses").doc(requestData.currentQueue).update({queue: queue});
            db.collection("users").doc(requestData.userEmail).update({currentQueue: null});
            return res.status(202).json({
                general: `Removed ${requestData.userEmail} from queue ${requestData.currentQueue} successfully`,
            });
        })
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

/**
 * Inserts a VIP in the front of the Queue.
 * first, checks if the user is a employee, then updates the queue by inserting the VIP queue slot in  front of the
 * queue.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 401 if the user is not of type employee
 *                  - 404 if the queue is no longer active
 *                  - 500 if an error occurs in the midst of the query
 *                  - 201 if successful
 */
export const vipEnterQueue = async (req: Request, res: Response) => {
    const requestData = {
        userType: req.body.userType,
        businessName: req.body.businessName,
    };
    if (requestData.userType !== "employee") {
        return res.status(401).json({general: "unauthorized. Login as an employee of the business!"});
    }
    return await db
        .collection("businesses")
        .where("name", "==", requestData.businessName)
        .get()
        .then((data) => {
            const queue: any = data.docs[0].data().queue;
            if (!queue.isActive) {
                return res.status(404).json({general: "the queue is no longer active!",});
            }
            const VIPSlot = createVIPSlotCredentials();
            queue.queueSlots.unshift(VIPSlot);
            db.collection("businesses").doc(requestData.businessName).update({queue: queue});
            return res.status(201).json({
                general: `${VIPSlot.customer} has been successfully added into the queue`,
                VIPSlotInfo: {
                    customer: VIPSlot.customer,
                    password: VIPSlot.password,
                    ticketNumber: VIPSlot.ticketNumber,
                }
            });
        })
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

/**
 * Deactivates the Queue.
 * first checks if the user is a manager, then removes all the current queues of the customers first and assigns an
 * empty list instead of the queueSlots.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 500 if an error occurs in the midst of the query
 *                  - 202 if successful
 */
const deactivateQueue = async (req: Request, res: Response) => {
    const requestData = {
        businessName: req.body.businessName,
        userType: req.body.userType,
    };
    return await db
        .collection("businesses")
        .where("name", "==", requestData.businessName)
        .get()
        .then(async (data) => {
            const queue: any = data.docs[0].data().queue;
            for (const customer of queue.queueSlots.map((queueSlot: any) => queueSlot.customer)) {
                await db
                    .collection("users")
                    .doc(customer)
                    .update({currentQueue: null})
                    .catch(err => console.error(err));
            }
            queue.queueSlots = new Array<any>();
            return await db.collection("businesses")
                .doc(requestData.businessName)
                .update({queue: queue, isActive: false})
                .then(() => res.status(202).json({general: "successfully deactivated the queue!"}));
        })
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

/**
 * Activates the Queue.
 * first checks if the user is a manager, then for activation, it checks whether the queue is within the start
 * and end time, then activates it.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 404 if the store is closed
 *                  - 404 if can not obtain the hours of operation for the business
 *                  - 500 if an error occurs in the midst of the query
 *                  - 204 if successful
 */
const activateQueue = async (req: Request, res: Response) => {
    const requestData = {
        businessName: req.body.businessName,
        userType: req.body.userType,
    };
    const hours: any = await db
        .collection("businesses")
        .where("name", "==", requestData.businessName)
        .get()
        .then((data) => {
            const hours = data.docs[0].data().hours;
            return {
                startTime: hours.startTime[getTheDayOfTheWeekForArray()],
                endTime: hours.endTime[getTheDayOfTheWeekForArray()],
            };
        })
        .catch((err) => {
            console.error(err);
            return {};
        });
    if (!hours.endTime && !hours.startTime) {
        return res.status(404).json({general: "could not obtain the hours of operation for this business"});
    }
    const currentTime = new Date().toUTCString();
    const localTime = moment(currentTime).tz("America/Los_Angeles").format().slice(11, 16);
    if (localTime < hours.startTime || localTime > hours.endTime) {
        return res.status(404).json({general: "The store is closed now!"});
    }
    return await db
        .collection("businesses")
        .doc(requestData.businessName)
        .update({"queues.isActive": true})
        .then(() => res.status(204).json({general: "successfully activated the queue!"}))
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

/**
 * Activates or deactivates the Queue.
 * first checks if the user is a manager, then for activation, it checks whether the queue is within the start
 * and end time, then activates; for deactivation, it removes all the current queues of the customers first and assigns
 * an empty list instead of the queueSlots.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 404 if the store is closed
 *                  - 404 if can not obtain the hours of operation for the business
 *                  - 500 if an error occurs in the midst of the query
 *                  - 202 if deactivates successfully
 *                  - 204 if activates successfully
 */
export const changeQueueStatus = async (req: Request, res: Response) => {
    const requestData = {
        businessName: req.body.businessName,
        userType: req.body.userType,
    };
    if (requestData.userType !== "manager") {
        return res.status(401).json({general: "unauthorized. Login as a manager of the business!"});
    }
    const isQueueActive: boolean = await db
        .collection("queues")
        .where("queueName", "==", requestData.businessName)
        .get()
        .then((data) => data.docs[0].data().isActive)
        .catch((err) => {
            console.error(err);
            return false;
        });

    if (isQueueActive) {
        return deactivateQueue(req, res);
    } else {
        return activateQueue(req, res);
    }
};

/**
 * Gets the info for a single favourite queue.
 *
 * @param  queueName:   a string
 * @return              Object an object consisting on the information about the favourite queue
 */
const getFavouriteQueueInfo = async (queueName: string) => {
    return await db
        .collection("businesses")
        .where("name", "==", queueName)
        .get()
        .then((data) => {
            const usableData = data.docs[0].data();
            const queue: any = usableData.queue;
            return {
                isActive: queue.isActive,
                currentWaitTime: queue.queueSlots.length * parseInt(usableData.averageWaitTime),
                queueLength: queue.queueSlots.length,
                address: usableData.address,
                startTime: usableData.hours.startTime[getTheDayOfTheWeekForArray()],
                endTime: usableData.hours.endTime[getTheDayOfTheWeekForArray()],
                phoneNumber: usableData.phoneNumber,
                website: usableData.website,
            };
        })
        .catch(err => {
            console.error(err);
            return null;
        });
};

/**
 * Gets the favourite queues info for the customer.
 * first checks if the user is a customer, then gets the list of all their favourite businesses, and for each item in
 * the list gets the information about the queue.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 401 if the user is not of type customer
 *                  - 404 if can not find any favourite businesses!"
 *                  - 200 if successful
 */
export const getFavouriteQueuesForCustomer = async (req: Request, res: Response) => {
    const requestData = {
        userType: req.body.userType,
        userEmail: req.body.userEmail,
    };
    if (requestData.userType !== "customer") {
        return res.status(401).json({general: "unauthorized. Login as a customer!"});
    }
    const favoriteBusinessNames: Array<string> = await db
        .collection("users")
        .where("email", "==", requestData.userEmail)
        .get()
        .then((data) => data.docs[0].data().favoriteBusinesses)
        .catch(() => null);
    if (favoriteBusinessNames === null) {
        return res.status(404).json({general: "Did not find any favourite businesses!"});
    }
    if (favoriteBusinessNames.length === 0) {
        return res.status(200).json({
            general: "successful",
            favouriteBusinesses: {},
        });
    }
    let favoriteBusinesses: any = {};
    for (const businessName of favoriteBusinesses) {
        const favBusiness: any = await getFavouriteQueueInfo(businessName);
        if (favBusiness) {
            favoriteBusinesses[businessName] = favBusiness;
        }
    }
    return res.status(200).json({
        general: "obtained the favourite businesses information successfully!",
        favoriteBusinesses: favoriteBusinesses,
    });
};

/**
 * Adds the queueName to the favourite queues or deletes the queueName from it.
 * first checks if the user is a customer, then adds the queue name to their list of favoriteBusinesses if the business
 * is not in their list otherwise deletes it from their list.
 *
 * @param req:      express Request Object
 * @param res:      express Response Object
 * @returns         Response the response data with the status code:
 *
 *                  - 401 if the user is not of type customer
 *                  - 500 if an error occurs in the midst of query
 *                  - 200 if successful
 */
export const changeStatusOfFavouriteBusiness = async (req: Request, res: Response) => {
    const requestData = {
        userType: req.body.userType,
        userEmail: req.body.userEmail,
        favoriteQueueName: req.body.favoriteQueueName,
    };
    if (requestData.userType !== "customer") {
        return res.status(401).json({general: "unauthorized. Login as a customer!"});
    }
    return await db
        .collection('users')
        .where('email', '==', requestData.userEmail)
        .get()
        .then(data => {
            const favoriteBusinesses: Array<string> = data.docs[0].data().favoriteBusinesses;
            return favoriteBusinesses.includes(requestData.favoriteQueueName);
        })
        .then(async (isInList: boolean) => {
            if (!isInList) {
                return await db
                    .collection('users')
                    .doc(requestData.userEmail)
                    .update({
                        favoriteBusinesses: firebase.firestore.FieldValue.arrayUnion(requestData.favoriteQueueName)
                    })
                    .then(() => res.status(200).json({
                        general: "added the queue to favourite businesses Successfully!",
                    }))
            }
            return await db
                .collection('users')
                .doc(requestData.userEmail)
                .update({
                    favoriteBusinesses: firebase.firestore.FieldValue.arrayRemove(requestData.favoriteQueueName)
                })
                .then(() => res.status(200).json({
                    general: "removed the queue from favourite businesses Successfully!",
                }))
        })
        .catch(async (err) => {
            console.error(err);
            return res.status(500).json({
                general: "Internal Error. Something went wrong!",
                error: await err.toString(),
            });
        });
};

