import { useSelector } from 'react-redux';

async function requestQueue (questionQTY, requests) {
    const Q = { questionQTY };
    const results = [];
    while (Q.length) {
        const current = Q.shift();

        try{
            const result = await current;
            results.push(result);
        }
        catch{
            throw new Error(error);
        }
    }
    return results;
} 