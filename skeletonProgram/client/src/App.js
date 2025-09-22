import React, { useState, useEffect } from 'react';

function App() {
  const [memberList, setMemberList] = useState({});
  useEffect(() => {
    fetch ("/members").then(
      res=>res.json()
    ).then(
      data => {
        setMemberList(data) 
        console.log(data)
      }
    )
  }, [])

  return (
    <div>
      {(typeof memberList.members === 'undefined') ? ( //checks if data exists yet from api
        <p>Loading...</p> //return Loading... if it doesn't
      ) : (
        memberList.members.map((member, i) => (//if returned display them one by one
          <p key={i}>{member}</p>
        ))
      )}
    </div>
  );
}

export default App;
