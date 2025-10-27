from flask import Blueprint, request, jsonify

get_frontend = Blueprint("get_frontend", __name__)

@get_frontend.route("/api/user_ID", methods=["POST"])
def get_user_ID():
    data = request.get_json()
    user_ID = data.get("user_ID")

    response = jsonify({
        "status": "initialized", 
        "user_ID": user_ID
    })

    return response