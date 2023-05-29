import axios from "axios";

const api = axios.create({
    baseURL: "http://10.0.0.116:8000/api/v1/faces",
});

export default api;