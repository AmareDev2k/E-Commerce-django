from django.contrib import admin
from .models import Category, Product, UserProfile, Order, OrderItems

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(UserProfile)
admin.site.register(Order)
admin.site.register(OrderItems)
