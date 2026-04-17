# SmartPath AI 🚀  
Real-Time Traffic-Aware Route Optimization System  

---

## 📌 About the Project  

SmartPath AI is a full-stack project designed to simulate how modern navigation systems find the fastest route in real-world traffic conditions.  

The system focuses on improving route computation by reducing unnecessary sorting operations used in traditional shortest path algorithms. This helps in achieving faster performance, especially when dealing with large and dynamically changing road networks.

---

## ❗ Problem  

Most routing systems rely on algorithms like Dijkstra, which use priority queues and repeated sorting.  
In large graphs with frequent traffic updates, this becomes inefficient and slows down route calculation.

---

## 💡 Our Approach  

We model the road network as a graph where:  
- Nodes represent locations or intersections  
- Edges represent roads  
- Weights represent traffic or travel time  

The system compares traditional algorithms with a modified approach that reduces sorting overhead by processing nodes in groups instead of fully sorting them every time.

---

## ⚙️ Technologies Used  

- **Python** → Core logic and algorithm implementation  
- **Django** → Backend API to handle requests and responses  
- **Django REST Framework** → API communication between frontend and backend  
- **React.js** → User interface and visualization  
- **NetworkX** → Graph creation and processing  
- **Git & GitHub** → Version control and collaboration  

---

## 🧠 Algorithms Included  

- Dijkstra’s Algorithm  
- Bellman-Ford Algorithm  
- Breadth-First Search (BFS)  
- Modified Sorting-Efficient Approach  

---

## 🏗️ Project Structure  

SmartPath-AI/
│
├── backend/        # Django APIs  
├── frontend/       # React UI  
├── algorithms/     # Core algorithm logic  
├── README.md  

---

## 🔄 Workflow  

1. User enters graph data or selects a route  
2. Frontend sends request to backend  
3. Backend runs selected algorithm  
4. Shortest path and execution time are calculated  
5. Result is displayed on the UI  

---

## 📊 Key Features  

- Traffic-aware route simulation  
- Multiple algorithm comparison  
- Dynamic edge weight updates  
- Clean and interactive UI  
- Performance tracking  

---

## 🎯 Objective  

The goal of this project is to explore how reducing sorting operations can improve the efficiency of shortest path algorithms in real-world scenarios.

---

## 🌍 Use Cases  

- Navigation systems  
- Delivery route planning  
- Emergency services routing  
- Network optimization  
- Game pathfinding  

---

## 🔮 Future Improvements  

- Real-time traffic data integration  
- AI-based traffic prediction  
- Mobile application version  
- Large-scale testing  

---

## 👥 Team  

- Rishi Kulshresth  
- Adarsh Chauhan
- Raghavendra Verma 
- Sidharth Sudhir

---

## ▶️ Running the Project  

### Backend
cd backend  
python manage.py runserver  

### Frontend
cd frontend  
npm install  
npm start  

---

## 📌 Note  

This project is built for learning and research purposes, inspired by recent advancements in shortest path optimization.
