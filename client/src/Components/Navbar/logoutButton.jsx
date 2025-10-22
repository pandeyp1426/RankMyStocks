import { useAuth0 } from "@auth0/auth0-react";
import { use } from "react";

const LogoutButton = () => {
    const { logout, isAuthenticated } = useAuth0();

    return( 

        isAuthenticated &&(
            <button onClick ={() => logout()}>
                Login
            </button>
        )
    )
}
export default LogoutButton