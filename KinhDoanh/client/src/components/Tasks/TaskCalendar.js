/**
 * Task Calendar Component
 * Hiển thị tasks dưới dạng lịch
 */

import React, { useState } from 'react';
import { Badge, Card } from 'react-bootstrap';
import './TaskCalendar.css';

const TASK_TYPES = {
  fire_safety: { icon: '🔥', color: 'danger' },
  security: { icon: '🔒', color: 'warning' },
  maintenance: { icon: '🔧', color: 'info' },
  inspection: { icon: '🔍', color: 'primary' },
  cleaning: { icon: '🧹', color: 'success' },
  equipment_check: { icon: '⚙️', color: 'secondary' },
  other: { icon: '📋', color: 'dark' }
};

function TaskCalendar({ tasks, onTaskClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      return taskDate === dateStr;
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return today.getDate() === day &&
           today.getMonth() === month &&
           today.getFullYear() === year;
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Generate calendar grid
  const calendarDays = [];
  const totalSlots = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

  for (let i = 0; i < totalSlots; i++) {
    const day = i - startingDayOfWeek + 1;
    
    if (day > 0 && day <= daysInMonth) {
      const date = new Date(year, month, day);
      const dayTasks = getTasksForDate(date);
      
      calendarDays.push({
        day,
        date,
        tasks: dayTasks,
        isToday: isToday(day),
        isCurrentMonth: true
      });
    } else {
      calendarDays.push({
        day: null,
        date: null,
        tasks: [],
        isToday: false,
        isCurrentMonth: false
      });
    }
  }

  return (
    <div className="task-calendar">
      {/* Header */}
      <div className="calendar-header d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-primary btn-sm" onClick={previousMonth}>
          <i className="fas fa-chevron-left"></i> Tháng trước
        </button>
        <h5 className="mb-0">{monthNames[month]} {year}</h5>
        <button className="btn btn-outline-primary btn-sm" onClick={nextMonth}>
          Tháng sau <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day headers */}
        {dayNames.map(dayName => (
          <div key={dayName} className="calendar-day-header">
            {dayName}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className={`calendar-day ${dayData.isCurrentMonth ? '' : 'other-month'} ${dayData.isToday ? 'today' : ''}`}
          >
            {dayData.day && (
              <>
                <div className="day-number">{dayData.day}</div>
                <div className="day-tasks">
                  {dayData.tasks.slice(0, 3).map(task => {
                    const typeInfo = TASK_TYPES[task.task_type] || TASK_TYPES.other;
                    return (
                      <div
                        key={task.id}
                        className={`task-item task-${task.status}`}
                        onClick={() => onTaskClick && onTaskClick(task.id)}
                        title={task.title}
                      >
                        <span className="task-icon">{typeInfo.icon}</span>
                        <span className="task-title">{task.title}</span>
                      </div>
                    );
                  })}
                  {dayData.tasks.length > 3 && (
                    <div className="more-tasks">
                      +{dayData.tasks.length - 3} khác
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <Card className="mt-3">
        <Card.Body>
          <h6 className="mb-2">Chú thích:</h6>
          <div className="d-flex flex-wrap gap-2">
            <Badge bg="secondary">⚪ Chờ xử lý</Badge>
            <Badge bg="primary">🔵 Đang làm</Badge>
            <Badge bg="success">✅ Hoàn thành</Badge>
            <Badge bg="danger">🔴 Quá hạn</Badge>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default TaskCalendar;
