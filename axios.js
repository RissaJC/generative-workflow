// api/jumpcloudApi.ts
import axios from 'axios';
import { z } from 'zod';

const API_BASE_URL = 'https://console.wok-roy-issa.dev-usw2-p02.jcplatform.dev/api';

const providerApiKey = "jca_4RDGjgZtUacnCgETVxFEck2LjxgJAV9y5L7x"
const providerId = "67516b814070a80ac506f4cb"
// Define your base URL for the API

export async function getSystemUsers(params) {
  try {
    // 1. Validate input parameters using Zod
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': providerApiKey, // Add API key to headers
      'x-org-id': '-'
    };


    const axiosConfig = {
      method: 'GET',
      url: `${API_BASE_URL}/systemusers`,
      headers: headers,
      params: {
        limit: params?.limit,
        skip: params?.skip,
        sort: params?.sort,
        fields: params?.fields,
        filter: params?.filter, // Axios will handle array -> comma-separated if needed by API
        search: params?.search,
      },
    };

    const response = await axios(axiosConfig);

    
    return JSON.stringify(response.data);

  } catch (error) {
    // Log the full error for debugging internally
    console.error("Error in getSystemUsers:", error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Data:", error.response.data);
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
      // Return a clean, simple error message for the tool
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
      throw new Error("Network Error: No response from API server.");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Axios config error:", error.message);
      throw new Error(`Request Setup Error: ${error.message}`);
    }
  }
}

export async function createOrg(payload) {
  try {
    // 1. Validate input parameters using Zod
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': providerApiKey, // Add API key to headers
    };


    const axiosConfig = {
      method: 'POST',
      url: `${API_BASE_URL}/organizations`,
      headers: headers,
      data: {
  "_id": "",
  "name": payload.name,
  "organizationAdministrators": [],
  "organizationAdministratorsTotalCount": 0
},
    };

    const response = await axios(axiosConfig);
    return JSON.stringify(response.data);

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getPaginatedAdministrators = async (params) => {
  try {
    // 1. Validate input parameters using Zod
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': providerApiKey, // Add API key to headers
    };


    const axiosConfig = {
      method: 'GET',
      url: `${API_BASE_URL}/v2/providers/${providerId}/administrators`,
      headers: headers,
      params: {
        limit: params?.limit,
        skip: params?.skip,
        sort: params?.sort,
        fields: params?.fields,
        filter: params?.filter, // Axios will handle array -> comma-separated if needed by API
        search: params?.search,
      },
    };

    const response = await axios(axiosConfig);
    
    return JSON.stringify(response.data);

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const updateAdministrator = async (payload) => {

  try {
    // 1. Validate input parameters using Zod
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': providerApiKey, // Add API key to headers
      'x-org-id': null,
    };


    const axiosConfig = {
      method: 'PUT',
      url: `${API_BASE_URL}/users/${payload.id}`,
      headers: headers,
      data: payload,
    };

    const response = await axios(axiosConfig);
    return JSON.stringify(response.data);

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getOrganizations = async () => {
  try {
    // 1. Validate input parameters using Zod
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': providerApiKey, // Add API key to headers
    };

    const axiosConfig = {
      method: 'GET',
      url: `${API_BASE_URL}/organizations?limit=100`,
      headers: headers,
    };

    const response = await axios(axiosConfig);
    return JSON.stringify(response.data);

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const getAdminOrgnaizations = async (payload) => {
  try {
    // 1. Validate input parameters using Zod
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': providerApiKey, // Add API key to headers
    };

    const axiosConfig = {
      method: 'GET',
      url: `${API_BASE_URL}/v2/administrators/${payload.id}/organizationlinks`,
      headers: headers,
      params: {
        limit: params?.limit,
        skip: params?.skip,
      },
    };

    const response = await axios(axiosConfig);
    
    return JSON.stringify(response.data);

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const giveAdminAccessToOrg = async (payload) => {
    try {
    // 1. Validate input parameters using Zod
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': providerApiKey, // Add API key to headers
    };

    const axiosConfig = {
      method: 'POST',
      url: `${API_BASE_URL}/v2/administrators/${payload.adminId}/organizationlinks`,
      headers: headers,
      data:{
        organization: payload.organizationId
      },
    };

    const response = await axios(axiosConfig);
    
    return JSON.stringify(response.data);

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}