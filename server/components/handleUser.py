# from flask import Blueprint, request, jsonify
# from ..app import get_db_connection
# handleUser = Blueprint("get_frontend", __name__)

# @handleUser.route("/api/user_ID", methods=["POST"])
# def get_user_ID():
#     data = request.get_json()
#     user_ID = data.get("user_ID")
#     conn = get_db_connection()
#     cursor = conn.cursor()
#     cursor.execute("DESCRIBE user")
#     return jsonify({
#         "status": "initialized",
#         "user_ID": user_ID
#     })