from django.http import JsonResponse


def home(request):
    data = {
        'message': 'Welcome to the E-commerce Store!'
    }
    return JsonResponse(data)