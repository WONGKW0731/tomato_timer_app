from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_very_secret_key!'  # Change this in production
socketio = SocketIO(app, cors_allowed_origins="*") # Allow all origins for simplicity

# In-memory store for users in rooms
# Structure: { room_name: { session_id: {'username': 'name', 'status': 'idle'} } }
study_rooms = {
    "default_study_room": {}
}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    # Optionally, immediately send available rooms or other initial data
    # emit('available_rooms', list(study_rooms.keys()))

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    # Find which room the user was in and remove them
    for room_name, users_in_room in study_rooms.items():
        if request.sid in users_in_room:
            user_data = users_in_room.pop(request.sid)
            leave_room(room_name)
            emit('user_left', {'username': user_data['username'], 'sid': request.sid}, to=room_name)
            print(f"{user_data['username']} left {room_name}")
            break

@socketio.on('join_room')
def handle_join_room(data):
    username = data.get('username', 'Anonymous')
    room_name = data.get('room_name', 'default_study_room') # For simplicity, one room

    if room_name not in study_rooms:
        # Optionally create room if it doesn't exist or handle error
        study_rooms[room_name] = {}
        print(f"Created new room: {room_name}")


    # Check if user is already in another room or this room with a different SID (edge case)
    # For simplicity, we assume one connection per user for now.

    join_room(room_name)
    study_rooms[room_name][request.sid] = {'username': username, 'status': 'idle'}

    print(f"{username} (SID: {request.sid}) joined {room_name}")

    # Notify others in the room
    emit('user_joined', {'username': username, 'sid': request.sid, 'status': 'idle'}, to=room_name, include_self=False)

    # Send current list of users in the room to the new joinee
    current_users_in_room = [
        {'sid': sid, 'username': user_info['username'], 'status': user_info['status']}
        for sid, user_info in study_rooms[room_name].items()
    ]
    emit('current_room_users', {'users': current_users_in_room, 'room_name': room_name})


@socketio.on('update_status')
def handle_update_status(data):
    new_status = data.get('status', 'idle')
    room_name = None
    user_info = None

    # Find the user and their room
    for r_name, users in study_rooms.items():
        if request.sid in users:
            room_name = r_name
            user_info = users[request.sid]
            break

    if user_info and room_name:
        user_info['status'] = new_status
        print(f"User {user_info['username']} in {room_name} updated status to: {new_status}")
        emit('status_updated', {'sid': request.sid, 'username': user_info['username'], 'status': new_status}, to=room_name)
    else:
        print(f"Could not update status for SID: {request.sid}, user not found in any room.")


if __name__ == '__main__':
    print("Starting Flask-SocketIO server...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
