import './popup.css'

export function Popup(props) { 
  return props.trigger ? (
    <div className="popup">
      <div className="popup-inner">
        <button className="close-btn" onClick={() => props.setTrigger(false)}>
<<<<<<< HEAD
          X
=======
          ×
>>>>>>> Sprint1_Pradeep
        </button>
        {props.children}
      </div>
    </div>
  ) : "";
}
