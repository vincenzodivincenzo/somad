import { recordsHandler, validateBooking } from "../lib/records.js";
export default recordsHandler({ path: "data/bookings.json", validate: validateBooking, statuses: ["solicitada", "confirmada", "pagada", "cancelada"], defaultStatus: "solicitada" });
