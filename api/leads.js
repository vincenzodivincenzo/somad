import { recordsHandler, validateLead } from "../lib/records.js";
export default recordsHandler({ path: "data/leads.json", validate: validateLead, statuses: ["nuevo", "contactado", "reservado", "descartado"], defaultStatus: "nuevo" });
