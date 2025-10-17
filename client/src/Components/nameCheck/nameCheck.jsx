import useSelector from 'react-redux';
import { useState} from "react";
export function nameCheck(portfolioName) {
    const questionQTY = useSelector((state) => state.questionQTY.value);
    
    const sendRequest = async () => {
    try {
    const response = await axios.post("http://localhost:5000/api/portfolios", {
        portfolios: [
            { portfolioName: portfolioName, questionQTY: questionQTY },
      ]
    });
        console.log(response.data.message); 
        console.log("Total portfolios:", response.data.count);
        } catch (error) {
        console.error("Error adding portfolios:", error);
        }
    };

    if (portfolioName === "") {
            alert("Portfolio name cannot be empty.");
            sendRequest();
        } //else {
            //sendRequest();
        //}
        //Will need to complete later once the database records data and after tests
    return(
        <>
        </>
    );
}
