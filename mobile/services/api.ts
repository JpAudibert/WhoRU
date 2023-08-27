import axios from "axios";

const api = axios.create({
    baseURL: "http://10.0.0.123:5001",
});

export default api;