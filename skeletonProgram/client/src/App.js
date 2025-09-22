import React, { useState, useEffect } from 'react';

function App() {

  const [data, setData] = useState({});
  useEffect(() => {
    fetch ("/members").then(
      res=>res.json()
    ).then(
      data=>{setData(data)
      console.log(data)
      }
    )
  }, [])

  return (
    <div>
      {(typeof data.members === 'undefined') ? ( //checks if data exists yet from api
        <p>Loading...</p> //return Loading... if it doesn't
      ) : (
        data.members.map((member, i) => (//if returned display them one by one
          <p key={i}>{member}</p>
        ))
      )}
    </div>
  );
}

export default App;
