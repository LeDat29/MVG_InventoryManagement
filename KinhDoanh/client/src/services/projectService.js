// ProjectService - API for projects and warehouse zones
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/projects` : '/api/projects';

const projectService = {
  async getProjects(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_BASE, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      const msg = (error && error.response && error.response.data && error.response.data.message) || error.message || 'Loi tai danh sach du an';
      throw new Error(msg);
    }
  },
  async getZones(projectId) {
    if (!projectId) return { zones: [] };
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/${projectId}/zones`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const data = response.data;
      const zones = (data && data.data && data.data.zones) || data.zones || data || [];
      return { zones };
    } catch (error) {
      console.error('Error fetching zones:', error);
      const msg = (error && error.response && error.response.data && error.response.data.message) || error.message || 'Loi tai danh sach kho';
      throw new Error(msg);
    }
  },

  async createProject(projectData) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(API_BASE, projectData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      const msg = (error && error.response && error.response.data && error.response.data.message) || error.message || 'Lỗi tạo dự án';
      throw new Error(msg);
    }
  }
};

export default projectService;
