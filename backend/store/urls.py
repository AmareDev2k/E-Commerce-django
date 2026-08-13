from django.urls import path
from . import views

urlpatterns = [
    path('product/', views.get_products),
    path('category/', views.get_categories),
]

