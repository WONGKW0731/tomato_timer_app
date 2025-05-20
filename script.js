document.addEventListener('DOMContentLoaded', () => {
    // Connect to the Socket.IO server.
    // The URL connecting to will likely be the same URL that your app is served from.
    const socket = io(); // Defaults to current host

    const usernameInput = document.getElementById('username');
    const joinButton = document.getElementById('joinButton');
    const joinSection = document.getElementById('join-section');
    const roomSection = document.getElementById('room-section');
    const roomNameDisplay = document.getElementById('roomName');
    const userList = document.getElementById('userList');
    const mySidDisplay = document.getElementById('mySid');
    const myStatusDisplay = document.getElementById('myStatus');

    let currentRoom = null;
    let myUsername = '';

    socket.on('connect', () => {
        console.log('Connected to server with SID:', socket.id);
        mySidDisplay.textContent = socket.id;
    });

    joinButton.addEventListener('click', () => {
        myUsername = usernameInput.value.trim();
        if (myUsername) {
            // For this simple example, we join a default room.
            // In a real app, you might let the user select a room.
            socket.emit('join_room', { username: myUsername, room_name: 'default_study_room' });
            joinSection.style.display = 'none';
            roomSection.style.display = 'block';
        } else {
            alert('Please enter a username.');
        }
    });

    document.querySelectorAll('.status-btn').forEach(button => {
        button.addEventListener('click', () => {
            const newStatus = button.getAttribute('data-status');
            if (currentRoom) {
                socket.emit('update_status', { status: newStatus });
                // myStatusDisplay.textContent = newStatus; // Optimistic update, or wait for server confirmation
            }
        });
    });

    socket.on('current_room_users', (data) => {
        currentRoom = data.room_name;
        roomNameDisplay.textContent = `Room: ${currentRoom}`;
        console.log('Current users in room:', data.users);
        updateUserList(data.users);
    });

    socket.on('user_joined', (data) => {
        console.log('User joined:', data);
        if (data.sid !== socket.id) { // Don't add self again if server sends `include_self=False`
            const li = document.createElement('li');
            li.id = `user-${data.sid}`;
            li.textContent = `${data.username} (Status: ${data.status})`;
            userList.appendChild(li);
        }
    });

    socket.on('user_left', (data) => {
        console.log('User left:', data);
        const userElement = document.getElementById(`user-${data.sid}`);
        if (userElement) {
            userElement.remove();
        }
    });

    socket.on('status_updated', (data) => {
        console.log('Status updated:', data);
        const userElement = document.getElementById(`user-${data.sid}`);
        if (userElement) {
            userElement.textContent = `${data.username} (Status: ${data.status})`;
        }
        if (data.sid === socket.id) {
            myStatusDisplay.textContent = data.status;
        }
    });

    function updateUserList(users) {
        userList.innerHTML = ''; // Clear current list
        users.forEach(user => {
            const li = document.createElement('li');
            li.id = `user-${user.sid}`; // Assign an ID based on SID for easy updates
            li.textContent = `${user.username} (Status: ${user.status})`;
            userList.appendChild(li);

            if (user.sid === socket.id) {
                myStatusDisplay.textContent = user.status;
            }
        });
    }

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        roomNameDisplay.textContent = "Disconnected - Please refresh";
        userList.innerHTML = '';
        // Optionally, try to reconnect or show a message
    });
});