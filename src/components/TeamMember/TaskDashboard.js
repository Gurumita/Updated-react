import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useLocation, useNavigate } from 'react-router-dom';
import MessagePopup from './MessagePopup'; // Importing MessagePopup
import '../../styles/TeamMember/TaskDashboard.css';

const TaskDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const username = location.state?.username || 'Unknown User';
    const [milestones, setMilestones] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [userId, setUserId] = useState(null);
    const [projectManagerUserId, setProjectManagerUserId] = useState(null);
    const [projectManagerName, setProjectManagerName] = useState('');
    const [showMessagePopup, setShowMessagePopup] = useState(false);

    // Fetch team member data
    const fetchTeamMemberData = async () => {
        try {
            const response = await fetch(`http://localhost:8081/users/by-username?username=${username}`);
            const data = await response.json();
            setUserId(data.userid);
        } catch (error) {
            console.error('Error fetching team member data:', error);
        }
    };

    // Fetch project manager details
    const fetchProjectManagerDetails = async () => {
        try {
            const response = await fetch(`http://localhost:8081/projects/projectManager?username=${username}`);
            const data = await response.json();
            setProjectManagerUserId(data.userid);
            setProjectManagerName(data.username);
        } catch (error) {
            console.error('Error fetching project manager details:', error);
        }
    };

    // Fetch milestones
    const fetchMilestones = async () => {
        try {
            const response = await fetch('http://localhost:8081/milestones');
            const data = await response.json();
            setMilestones(data);
        } catch (error) {
            console.error('Error fetching milestones:', error);
        }
    };

    // Fetch tasks
    const fetchTasks = async () => {
        try {
            const response = await fetch(`http://localhost:8081/tasks/by-username/${username}`);
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        if (username && username !== 'Unknown User') {
            fetchTeamMemberData();
            fetchProjectManagerDetails();
            fetchMilestones();
            fetchTasks();
        } else {
            console.warn('Username not provided or invalid.');
        }
    }, [username]);

    const combinedData = milestones.map(milestone => {
        const milestoneTasks = tasks.filter(task => task.milestone.milestoneId === milestone.milestoneId);
        return {
            ...milestone,
            tasks: milestoneTasks
        };
    });

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        const taskId = parseInt(draggableId, 10);
        const sourceMilestone = milestones.find(milestone => milestone.milestoneId === combinedData[source.droppableId].milestoneId);
        const destinationMilestone = milestones.find(milestone => milestone.milestoneId === combinedData[destination.droppableId].milestoneId);
        const draggedTask = tasks.find(task => task.taskId === taskId);

        if (!draggedTask) {
            console.error(`Task with ID ${taskId} not found`);
            return;
        }

        const updatedTask = {
            ...draggedTask,
            milestone: {
                milestoneId: destinationMilestone.milestoneId,
                milestoneName: destinationMilestone.milestoneName,
                milestoneDescription: destinationMilestone.milestoneDescription
            }
        };

        try {
            await fetch(`http://localhost:8081/tasks/update-milestone?taskId=${taskId}&milestoneId=${destinationMilestone.milestoneId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            setTasks(tasks.map(task =>
                task.taskId === taskId ? updatedTask : task
            ));

            setMilestones(milestones.map(milestone => {
                if (milestone.milestoneId === sourceMilestone.milestoneId) {
                    return {
                        ...milestone,
                        tasks: milestone.tasks.filter(task => task.taskId !== taskId)
                    };
                } else if (milestone.milestoneId === destinationMilestone.milestoneId) {
                    return {
                        ...milestone,
                        tasks: [...milestone.tasks, updatedTask]
                    };
                }
                return milestone;
            }));

            alert('Task Milestone Updated Successfully!');
            setShowMessagePopup(true);

        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            navigate('/login');
        }
    };

    const handleNavigateToMessage = () => {
        navigate('/message', {
            state: {
                projectManagerName,
                projectManagerId: projectManagerUserId,
                senderId: userId
            }
        });
    };

    const handleResetPassword = () => {
        navigate('/reset-password-teammember', {
            state: { username }
        });
    };

    return (
        <>
            <nav className="navbar">
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <button className="nav-link" onClick={handleResetPassword}>Reset Password</button>
                    </li>
                    <li className="nav-item">
                        <button className="nav-link" onClick={handleNavigateToMessage}>Messages</button>
                    </li>
                    <li className="nav-item">
                        <button className="nav-link logout-button" onClick={handleLogout}>Logout</button>
                    </li>
                </ul>
            </nav>

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="milestones" direction="horizontal">
                    {(provided) => (
                        <div
                            className="milestones-container"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            <h1 className="welcome-message">Team Member Page</h1>
                            <p className="welcome-text">Welcome, {username}!</p>

                            {combinedData.map((milestone, index) => (
                                <Droppable key={milestone.milestoneId} droppableId={index.toString()} direction="vertical">
                                    {(provided) => (
                                        <div
                                            className="milestone"
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                        >
                                            <h3 className="milestone-title">{milestone.milestoneName}</h3>
                                            <p className="milestone-description">{milestone.milestoneDescription}</p>
                                            <div className="tasks">
                                                {milestone.tasks.length > 0 ? (
                                                    <ul>
                                                        {milestone.tasks.map((task, taskIndex) => (
                                                            <Draggable key={task.taskId} draggableId={task.taskId.toString()} index={taskIndex}>
                                                                {(provided) => (
                                                                    <li
                                                                        className="task-item"
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                    >
                                                                        <button 
                                                                            onClick={() => setSelectedTask(task)} 
                                                                            className="task-button"
                                                                        >
                                                                            {task.taskName}
                                                                        </button>
                                                                    </li>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>No tasks for this milestone.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            ))}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>

                {selectedTask && (
                    <div className="task-details-overlay" onClick={() => setSelectedTask(null)}>
                        <div className="task-details" onClick={(e) => e.stopPropagation()}>
                            <button className="close-button" onClick={() => setSelectedTask(null)}>×</button>
                            <h2>Task Details</h2>
                            <div className="task-detail">
                                <strong>Project Name:</strong> {selectedTask.project.projectName}
                            </div>
                            <div className="task-detail">
                                <strong>Task Name:</strong> {selectedTask.taskName}
                            </div>
                            <div className="task-detail">
                                <strong>Task Details:</strong> {selectedTask.taskDetails}
                            </div>
                            <div className="task-detail">
                                <strong>Milestone Name:</strong> {selectedTask.milestone.milestoneName}
                            </div>
                            <div className="task-detail">
                                <strong>Milestone Description:</strong> {selectedTask.milestone.milestoneDescription}
                            </div>
                            <div className="task-detail">
                                <strong>Start Date:</strong> {new Date(selectedTask.startDate).toLocaleDateString()}
                            </div>
                            <div className="task-detail">
                                <strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                )}

                {showMessagePopup && <MessagePopup />}
            </DragDropContext>
        </>
    );
};

export default TaskDashboard;
