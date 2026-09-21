import api from "@/lib/api";
import { User } from "@/context/AuthContext";

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
}

export const userService = {
  /**
   * Fetch all users
   */
  async getAllUsers(): Promise<User[]> {
    const response = await api.get('/users');
    return response.data;
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserPayload): Promise<User> {
    const response = await api.post('/users', data);
    return response.data;
  },

  /**
   * Delete a user by ID
   */
  /**
   * Delete a user by ID
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  /**
   * Change user password
   */
  async changePassword(id: string, data: any): Promise<void> {
    await api.patch(`/users/${id}/change-password`, data);
  }
};
