from django.urls import path
from . import views

urlpatterns = [
    path('graph/',  views.get_graph),
    path('cities/', views.get_cities),
    path('route/',  views.find_route),
]