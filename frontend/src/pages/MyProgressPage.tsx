import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProgressTracker from '../components/ProgressTracker';
import './MyProgressPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface EnrolledCourse {
  courseId: string;
  courseName: string;
  completionPercentage: number;
  completedVideos: number;
  totalVideos: number;
}

const MyProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  fetchEnrolledCourses();
}, [fetchEnrolledCourses]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseProgress(selectedCourseId);
    }
  }, [selectedCourseId]);

 const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Get all courses
      const coursesResponse = await axios.get(`${API_URL}/courses`);
      const allCourses = coursesResponse.data.courses;

      // Get progress for each course
      const enrolledCoursesData: EnrolledCourse[] = [];

      for (const course of allCourses) {
        try {
          const progressResponse = await axios.get(
            `${API_URL}/progress/course/${course._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          const progress = progressResponse.data;
          
          // Only include courses where student has started watching
          if (progress.videoProgress && progress.videoProgress.length > 0) {
            const hasProgress = progress.videoProgress.some(
              (vp: any) => vp.watched || vp.mcqAttempts.length > 0
            );

            if (hasProgress) {
              enrolledCoursesData.push({
                courseId: course._id,
                courseName: course.name,
                completionPercentage: progress.completionPercentage,
                completedVideos: progress.completedVideos,
                totalVideos: progress.totalVideos,
              });
            }
          }
        } catch (err) {
          // Course has no progress, skip it
          continue;
        }
      }

      setEnrolledCourses(enrolledCoursesData);

      // Auto-select first course if available
      if (enrolledCoursesData.length > 0 && !selectedCourseId) {
        setSelectedCourseId(enrolledCoursesData[0].courseId);
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching enrolled courses:', err);
      setError(err.response?.data?.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
    };

  const fetchCourseProgress = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/progress/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProgressData(response.data);
    } catch (err: any) {
      console.error('Error fetching course progress:', err);
      setError(err.response?.data?.message || 'Failed to load course progress');
    }
  };

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const handleGoToCourse = (courseId: string) => {
    navigate(`/student/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="my-progress-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-progress-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchEnrolledCourses}>Retry</button>
        </div>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="my-progress-page">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>No Progress Yet</h2>
          <p>Start watching courses to track your progress</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/student/dashboard')}
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  const selectedCourse = enrolledCourses.find((c) => c.courseId === selectedCourseId);

  return (
    <div className="my-progress-page">
      <div className="page-header">
        <h1>My Progress</h1>
        <p className="subtitle">Track your learning journey</p>
      </div>

      <div className="progress-layout">
        <div className="courses-sidebar">
          <h3>Enrolled Courses</h3>
          <div className="course-list">
            {enrolledCourses.map((course) => (
              <div
                key={course.courseId}
                className={`course-item ${
                  selectedCourseId === course.courseId ? 'active' : ''
                }`}
                onClick={() => handleCourseSelect(course.courseId)}
              >
                <div className="course-item-header">
                  <h4>{course.courseName}</h4>
                  <button
                    className="btn-go-to-course"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGoToCourse(course.courseId);
                    }}
                  >
                    →
                  </button>
                </div>
                <div className="course-item-progress">
                  <div className="progress-bar-small">
                    <div
                      className="progress-bar-fill-small"
                      style={{ width: `${course.completionPercentage}%` }}
                    />
                  </div>
                  <span className="progress-text-small">
                    {course.completionPercentage}% • {course.completedVideos}/
                    {course.totalVideos} videos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="progress-content">
          {progressData && selectedCourse && (
            <ProgressTracker
              courseId={selectedCourseId!}
              courseName={selectedCourse.courseName}
              completionPercentage={progressData.completionPercentage}
              completedVideos={progressData.completedVideos}
              totalVideos={progressData.totalVideos}
              videoProgress={progressData.videoProgress}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProgressPage;
