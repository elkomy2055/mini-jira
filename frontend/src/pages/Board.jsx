import React, { useEffect, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";
import api from "../utils/api";
import useAuthStore from "../context/authStore";
import TaskModal from "../components/tasks/TaskModal";
import CreateTaskModal from "../components/tasks/CreateTaskModal";

const STATUSES = ["To Do", "In Progress", "In Review", "Done"];

const STATUS_COLORS = {
  "To Do": "var(--text-muted)",
  "In Progress": "var(--accent)",
  "In Review": "var(--purple)",
  "Done": "var(--success)",
};

function PriorityDot({ priority }) {
  const cls = { Critical: "priority-critical", High: "priority-high", Medium: "priority-medium", Low: "priority-low" };
  return <span className={`priority-dot ${cls[priority] || "priority-low"}`} />;
}

function StatusBadge({ status }) {
  const cls = { "To Do": "badge-todo", "In Progress": "badge-inprogress", "In Review": "badge-inreview", "Done": "badge-done" };
  return <span className={`badge ${cls[status] || "badge-todo"}`}>{status}</span>;
}

function TaskCard({ task, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.taskId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done";

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="kanban-card" onClick={() => onClick(task)}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <PriorityDot priority={task.priority} />
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: "var(--text)" }}>
          {task.title}
        </div>
      </div>

      {task.description && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {task.description}
        </div>
      )}

      {task.resizedImageUrl && (
        <img src={task.resizedImageUrl} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4, marginBottom: 8 }} />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span className={`badge badge-${(task.priority || "medium").toLowerCase()}`}>
          {task.priority}
        </span>
        {task.deadline && (
          <span style={{ fontSize: 11, color: isOverdue ? "var(--danger)" : "var(--text-muted)" }}>
            {isOverdue ? "⚠ " : ""}
            {new Date(task.deadline).toLocaleDateString()}
          </span>
        )}
      </div>

      {task.assigneeName && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>
            {task.assigneeName[0]?.toUpperCase()}
          </div>
          {task.assigneeName}
          {task.teamName && <span style={{ color: "var(--text-dim)" }}>· {task.teamName}</span>}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ status, tasks, onTaskClick }) {
  return (
    <div className="kanban-column">
      <div className="kanban-col-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[status] }} />
          {status}
        </div>
        <span style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 12, fontSize: 11, color: "var(--text-muted)" }}>
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.taskId)} strategy={verticalListSortingStrategy}>
        <div className="kanban-col-body">
          {tasks.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "20px 0" }}>
              No tasks here
            </div>
          )}
          {tasks.map((task) => (
            <TaskCard key={task.taskId} task={task} onClick={onTaskClick} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Board() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTeam, setFilterTeam] = useState("");
  const [teams, setTeams] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const { isManager, user } = useAuthStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchTasks = useCallback(async () => {
    try {
      const params = filterTeam ? `?teamId=${filterTeam}` : "";
      const { data } = await api.get(`/tasks${params}`);
      setTasks(data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filterTeam]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (isManager()) {
      api.get("/teams").then(({ data }) => setTeams(data)).catch(() => {});
    }
  }, [isManager]);

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const draggedTask = tasks.find((t) => t.taskId === active.id);
    const targetTask = tasks.find((t) => t.taskId === over.id);
    if (!draggedTask || !targetTask) return;

    const newStatus = targetTask.status;
    if (draggedTask.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.taskId === draggedTask.taskId ? { ...t, status: newStatus } : t));

    try {
      await api.put(`/tasks/${draggedTask.taskId}`, { status: newStatus });
      toast.success(`Moved to "${newStatus}"`);
    } catch {
      toast.error("Failed to update task status");
      fetchTasks();
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const draggedTask = tasks.find((t) => t.taskId === active.id);
    if (!draggedTask) return;

    // If over a column header or empty column, update status
    const overTask = tasks.find((t) => t.taskId === over.id);
    if (!overTask) return;

    if (draggedTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) => t.taskId === active.id ? { ...t, status: overTask.status } : t)
      );
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const activeTask = activeId ? tasks.find((t) => t.taskId === activeId) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Kanban Board</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {user?.teamId ? `Team: ${user.teamName || user.teamId}` : "All teams"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isManager() && teams.length > 0 && (
            <select className="select" style={{ width: "auto" }} value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
              <option value="">All Teams</option>
              {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
            </select>
          )}
          {isManager() && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + New Task
            </button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        <div className="kanban-board">
          {STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} tasks={tasksByStatus[status] || []} onTaskClick={setSelectedTask} />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdated={fetchTasks} />
      )}
      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchTasks(); }} />
      )}
    </div>
  );
}
