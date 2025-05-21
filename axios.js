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

    
    return response;

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
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
    return response;

  } catch (error) {
    console.error('Unexpected Error:', error);
    throw new Error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}