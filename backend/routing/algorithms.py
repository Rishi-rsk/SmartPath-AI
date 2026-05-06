import heapq
import time
import osmnx as ox
import math

# ─── City configurations ──────────────────────────────────────────
CITIES = {
    'shimla': {
        'name': 'Shimla, India',
        'query': 'Shimla, Himachal Pradesh, India',
        'center': {'lat': 31.1048, 'lng': 77.1734},
        'zoom': 14,
    },
    'delhi': {
        'name': 'Delhi, India',
        'query': 'New Delhi, Delhi, India',
        'center': {'lat': 28.6289, 'lng': 77.2065},
        'zoom': 13,
    },
    'mumbai': {
        'name': 'Mumbai, India',
        'query': 'Mumbai, Maharashtra, India',
        'center': {'lat': 19.0596, 'lng': 72.8295},
        'zoom': 13,
    },
    'chandigarh': {
        'name': 'Chandigarh, India',
        'query': 'Chandigarh, India',
        'center': {'lat': 30.7333, 'lng': 76.7794},
        'zoom': 13,
    },
}

# ─── Graph cache per city ─────────────────────────────────────────
_graph_cache = {}

def get_city_graph(city_key='shimla'):
    global _graph_cache
    if city_key in _graph_cache:
        return _graph_cache[city_key]
    city = CITIES[city_key]
    print(f"Loading {city['name']} road network...")
    G = ox.graph_from_place(city['query'], network_type='drive')
    G = ox.add_edge_speeds(G)
    G = ox.add_edge_travel_times(G)
    _graph_cache[city_key] = G
    print(f"{city['name']} loaded: {len(G.nodes)} nodes, {len(G.edges)} edges")
    return G

def get_nearest_node(G, lat, lng):
    return ox.distance.nearest_nodes(G, lng, lat)

# ─── Haversine heuristic (real GPS distance) ──────────────────────
def haversine(G, u, v):
    u_data = G.nodes[u]
    v_data = G.nodes[v]
    R = 6371000  # Earth radius in meters
    lat1, lon1 = math.radians(u_data['y']), math.radians(u_data['x'])
    lat2, lon2 = math.radians(v_data['y']), math.radians(v_data['x'])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ─── Edge weight based on vehicle type ───────────────────────────
def get_weight(G, u, v, vehicle_type='normal'):
    edge_data = G[u][v]
    if vehicle_type in ['ambulance', 'fire']:
        return min(d.get('length', 1) for d in edge_data.values())
    elif vehicle_type == 'police':
        return min(d.get('travel_time', d.get('length', 1)) * 0.7
                   for d in edge_data.values())
    else:
        return min(d.get('travel_time', d.get('length', 1))
                   for d in edge_data.values())

# ─── Path helpers ─────────────────────────────────────────────────
def _reconstruct_path(prev, source, target):
    path = []
    node = target
    while node is not None:
        path.append(node)
        node = prev[node]
    path.reverse()
    return path if path and path[0] == source else []

def _path_to_coords(G, path):
    return [{'lat': G.nodes[n]['y'], 'lng': G.nodes[n]['x']} for n in path]

def _path_to_directions(G, path):
    directions = []
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        edge_data = G[u][v]
        best = min(edge_data.values(),
                   key=lambda d: d.get('travel_time', 999))
        name = best.get('name', 'Unnamed Road')
        if isinstance(name, list):
            name = name[0]
        length = best.get('length', 0)
        speed = best.get('speed_kph', 30)
        directions.append({
            'step': i + 1,
            'road': name,
            'distance_m': round(length),
            'speed_kph': round(speed) if isinstance(speed, float) else speed,
        })
    return directions

def _build_result(algorithm, path, dist_target, nodes_visited,
                  sort_operations, elapsed, G):
    return {
        'algorithm': algorithm,
        'path': path,
        'distance': round(dist_target, 2),
        'nodes_visited': nodes_visited,
        'sort_operations': sort_operations,
        'time_ms': round(elapsed * 1000, 4),
        'coordinates': _path_to_coords(G, path),
        'directions': _path_to_directions(G, path),
    }

# ─── Algorithm 1: Standard Dijkstra ──────────────────────────────
def dijkstra(G, source, target, vehicle_type='normal'):
    t0 = time.perf_counter()
    nodes_visited = sort_ops = 0

    dist = {n: float('inf') for n in G.nodes}
    dist[source] = 0
    prev = {n: None for n in G.nodes}
    pq = [(0, source)]

    while pq:
        sort_ops += 1
        d, u = heapq.heappop(pq)
        nodes_visited += 1
        if u == target:
            break
        if d > dist[u]:
            continue
        for v in G.neighbors(u):
            w = get_weight(G, u, v, vehicle_type)
            nd = dist[u] + w
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
                sort_ops += 1

    path = _reconstruct_path(prev, source, target)
    return _build_result('Dijkstra', path, dist[target],
                         nodes_visited, sort_ops, time.perf_counter() - t0, G)

# ─── Algorithm 2: A* with real Haversine heuristic ───────────────
def astar(G, source, target, vehicle_type='normal'):
    t0 = time.perf_counter()
    nodes_visited = sort_ops = 0

    dist = {n: float('inf') for n in G.nodes}
    dist[source] = 0
    prev = {n: None for n in G.nodes}
    pq = [(haversine(G, source, target), 0, source)]

    while pq:
        sort_ops += 1
        _, g, u = heapq.heappop(pq)
        nodes_visited += 1
        if u == target:
            break
        if g > dist[u]:
            continue
        for v in G.neighbors(u):
            w = get_weight(G, u, v, vehicle_type)
            ng = dist[u] + w
            if ng < dist[v]:
                dist[v] = ng
                prev[v] = u
                f = ng + haversine(G, v, target)
                heapq.heappush(pq, (f, ng, v))
                sort_ops += 1

    path = _reconstruct_path(prev, source, target)
    return _build_result('A*', path, dist[target],
                         nodes_visited, sort_ops, time.perf_counter() - t0, G)

# ─── Algorithm 3: Lazy Deletion Dijkstra ─────────────────────────
def lazy_dijkstra(G, source, target, vehicle_type='normal'):
    t0 = time.perf_counter()
    nodes_visited = sort_ops = 0

    dist = {n: float('inf') for n in G.nodes}
    dist[source] = 0
    prev = {n: None for n in G.nodes}
    pq = [(0, source)]
    visited = set()

    while pq:
        sort_ops += 1
        d, u = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        nodes_visited += 1
        if u == target:
            break
        for v in G.neighbors(u):
            w = get_weight(G, u, v, vehicle_type)
            nd = dist[u] + w
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
                sort_ops += 1

    path = _reconstruct_path(prev, source, target)
    return _build_result('Lazy Dijkstra', path, dist[target],
                         nodes_visited, sort_ops, time.perf_counter() - t0, G)

# ─── Algorithm 4: Bidirectional Dijkstra ─────────────────────────
def bidirectional_dijkstra(G, source, target, vehicle_type='normal'):
    t0 = time.perf_counter()
    nodes_visited = sort_ops = 0

    # Forward and backward structures
    dist_f = {n: float('inf') for n in G.nodes}
    dist_b = {n: float('inf') for n in G.nodes}
    dist_f[source] = 0
    dist_b[target] = 0
    prev_f = {n: None for n in G.nodes}
    prev_b = {n: None for n in G.nodes}
    pq_f = [(0, source)]
    pq_b = [(0, target)]
    visited_f = set()
    visited_b = set()
    best = float('inf')
    meeting_node = None

    while pq_f or pq_b:
        # Forward step
        if pq_f:
            sort_ops += 1
            d, u = heapq.heappop(pq_f)
            if u not in visited_f:
                visited_f.add(u)
                nodes_visited += 1
                if d <= best:
                    for v in G.neighbors(u):
                        w = get_weight(G, u, v, vehicle_type)
                        nd = dist_f[u] + w
                        if nd < dist_f[v]:
                            dist_f[v] = nd
                            prev_f[v] = u
                            heapq.heappush(pq_f, (nd, v))
                            sort_ops += 1
                        if v in visited_b:
                            total = nd + dist_b[v]
                            if total < best:
                                best = total
                                meeting_node = v

        # Backward step
        if pq_b:
            sort_ops += 1
            d, u = heapq.heappop(pq_b)
            if u not in visited_b:
                visited_b.add(u)
                nodes_visited += 1
                if d <= best:
                    for v in G.predecessors(u):
                        w = get_weight(G, v, u, vehicle_type)
                        nd = dist_b[u] + w
                        if nd < dist_b[v]:
                            dist_b[v] = nd
                            prev_b[v] = u
                            heapq.heappush(pq_b, (nd, v))
                            sort_ops += 1
                        if v in visited_f:
                            total = dist_f[v] + nd
                            if total < best:
                                best = total
                                meeting_node = v

        # Termination check
        min_f = pq_f[0][0] if pq_f else float('inf')
        min_b = pq_b[0][0] if pq_b else float('inf')
        if min_f + min_b >= best:
            break

    # Reconstruct path through meeting node
    if meeting_node is None:
        path = []
    else:
        path_f = []
        node = meeting_node
        while node is not None:
            path_f.append(node)
            node = prev_f[node]
        path_f.reverse()

        path_b = []
        node = prev_b[meeting_node]
        while node is not None:
            path_b.append(node)
            node = prev_b[node]

        path = path_f + path_b

    return _build_result('Bidirectional', path, best,
                         nodes_visited, sort_ops, time.perf_counter() - t0, G)

# ─── Compare all 4 algorithms ────────────────────────────────────
def compare_all(source_lat, source_lng, target_lat, target_lng,
                city_key='shimla', vehicle_type='normal'):
    G = get_city_graph(city_key)
    source = get_nearest_node(G, source_lat, source_lng)
    target = get_nearest_node(G, target_lat, target_lng)
    return [
        dijkstra(G, source, target, vehicle_type),
        astar(G, source, target, vehicle_type),
        lazy_dijkstra(G, source, target, vehicle_type),
        bidirectional_dijkstra(G, source, target, vehicle_type),
    ]

def get_graph_info(city_key='shimla'):
    G = get_city_graph(city_key)
    city = CITIES[city_key]
    return {
        'nodes': len(G.nodes),
        'edges': len(G.edges),
        'city': city['name'],
        'center': city['center'],
        'zoom': city['zoom'],
    }