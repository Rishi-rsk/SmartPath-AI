from rest_framework.decorators import api_view
from rest_framework.response import Response
from .algorithms import compare_all, get_graph_info, CITIES

@api_view(['GET'])
def get_graph(request):
    city_key = request.GET.get('city', 'shimla')
    if city_key not in CITIES:
        return Response({'error': 'Invalid city'}, status=400)
    return Response(get_graph_info(city_key))

@api_view(['GET'])
def get_cities(request):
    return Response([
        {'key': k, 'name': v['name'],
         'center': v['center'], 'zoom': v['zoom']}
        for k, v in CITIES.items()
    ])

@api_view(['POST'])
def find_route(request):
    try:
        source_lat   = float(request.data.get('source_lat', 31.1048))
        source_lng   = float(request.data.get('source_lng', 77.1734))
        target_lat   = float(request.data.get('target_lat', 31.0986))
        target_lng   = float(request.data.get('target_lng', 77.1734))
        city_key     = request.data.get('city', 'shimla')
        vehicle_type = request.data.get('vehicle_type', 'normal')

        results = compare_all(
            source_lat, source_lng,
            target_lat, target_lng,
            city_key, vehicle_type
        )
        return Response({
            'source':       {'lat': source_lat, 'lng': source_lng},
            'target':       {'lat': target_lat, 'lng': target_lng},
            'city':         city_key,
            'vehicle_type': vehicle_type,
            'results':      results,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)