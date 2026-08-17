# Store Backend Project — සම්පූර්ණ විස්තරය

Django + Django REST Framework + PostgreSQL භාවිතයෙන් හදපු **e-commerce backend** එකක්. Products, Categories, Cart, සහ Orders handle කරන REST API එකක් මෙයින් ලබාදෙනවා. Frontend එකට (React/Vite) JSON හරහා connect වෙනවා.

---

## 1. Folder Architecture (Folder ව්‍යුහය)

```
backend/
├── manage.py      → Django CLI entry point (runserver, migrate ආදිය run කරන file එක)
├── .env           → DB credentials (password, host ආදිය) - git එකට commit කරන්න එපා
├── pyrefly.toml       → Type-checker (pyrefly) configuration
├── media/product/       → Upload කරන product images save වෙන තැන
├── backend/            → PROJECT config folder (root config)
│   ├── __init__.py      → Python package marker (empty)
│   ├── settings.py      → සියලුම configuration (apps, middleware, DB, CORS...)
│   ├── urls.py         → Root URL router
│   ├── wsgi.py         → Sync server deployment entry point (Gunicorn)
│   └── asgi.py        → Async server entry point (WebSocket වලට)
└── store/            → APP එක (actual business logic ඔක්කොම මෙතන)
    ├── models.py     → Database tables define කරන තැන
    ├── serializers.py  → Model ↔ JSON convert කරන logic
    ├── views.py        → API endpoints එකේ actual logic
    ├── urls.py         → App-level routes (/api/ එකට යටින්)
    ├── admin.py        → Admin panel එකට models register කරන තැන
    ├── apps.py         → App configuration (auto-generated)
    ├── tests.py         → Unit tests (currently empty)
    └── migrations/    → Database schema history
```

### Django Convention එක

- **Project** (`backend/backend/`) — මුළු application එකේම global settings/routing එක. එකයි.
- **App** (`store/`) — features වෙන් වෙන් කරගන්න module එකක්. Project එකකට apps ගොඩක් තියෙන්න පුළුවන් (උදා: `store`, `accounts`, `payments`).

Project එකේ දැනට app එකයි (`store`) තියෙන්නේ, ඒත් future එකේදී `accounts/`, `payments/` වගේ apps add කරගන්න පුළුවන් structure එකක් මේක.

---

## 2. Models (`store/models.py`) — Database Tables

| Model | විස්තරය |
|---|---|
| **Category** | `name`, `slug` (URL-friendly identifier) |
| **Product** | Category එකකට අයිති (`ForeignKey`), `name`, `description`, `price`, `image` |
| **UserProfile** | Django ගේ built-in `User` එකට `phone`/`address` add කරනවා (`OneToOneField`) |
| **Order** | Placed order එකක් — `user` (optional), `created_at`, `total_amount` |
| **OrderItems** | Order එකක line items — `order`, `product`, `quantity`, `price` (snapshot) |
| **Cart** | Shopping cart — `user` (optional), `created_at`, `total` (computed) |
| **CartItem** | Cart එකේ item එකක් — `cart`, `product`, `quantity`, `subtotal` (computed) |

### Model එකේ Field Types — Practical Example

```python
class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='product/', blank=True, null=True)
    create_at = models.DateTimeField(auto_now_add=True)
```

- **`ForeignKey` + `related_name='products'`** → `category.products.all()` කියලා call කරලා ඒ category එකට අයිති products ඔක්කොම ගන්න පුළුවන්
- **`on_delete=models.CASCADE`** → Category එකක් delete කළොත්, ඒකට අයිති products ඔක්කොම automatic ම delete වෙනවා
- **`DecimalField`** → Money/price values වලට `FloatField` වෙනුවට use කරන්නේ rounding errors වළක්වන්න (exact precision ඕන)
- **`blank=True, null=True`** (ImageField) → image එක optional. `blank` = validation එකේදී required නෑ, `null` = DB column එකේ NULL allow කරනවා
- **`auto_now_add=True`** → record එක create කරන instant එකේ timestamp එක save වෙනවා, ආයෙත් update වෙන්නේ නෑ

### Fat Model Pattern — Business Logic Model එකේ

```python
class Cart(models.Model):
    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())

class CartItem(models.Model):
    @property
    def subtotal(self):
        return self.quantity * self.product.price
```

Django convention එකේ "**Fat Models, Thin Views**" කියලා pattern එකක් තියෙනවා — object එකට directly related calculation logic (`subtotal`, `total`) model එකේම දානවා, service class එකකට වෙන් කරනවා වෙනුවට. `@property` decorator එකෙන් method එකක් field එකක් වගේ access කරන්න පුළුවන් (`cart.total`, `()` නැතුව).

Spring Boot එකට habituated කෙනෙක්ට මේක "Entity එකේ logic නැති ඕන, Service layer එකේ තියෙන්න ඕන" කියලා strange feel වෙන්න පුළුවන්, ඒත් Django ecosystem එකේදී මේක standard convention එකක්. Complex, multi-step logic (payment processing, multi-model transactions) සඳහා පමණක් Django projects `services.py` pattern එකකට යනවා.

---

## 3. Serializers (`store/serializers.py`) — DB ↔ JSON Translator

```python
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    class Meta:
        model = Product
        fields = '__all__'
```

- `CategorySerializer` — simple, field ඔක්කොම JSON එකට convert කරනවා
- `ProductSerializer` — **Nested Serializer**: `category` field එකට ID එකක් විතරක් දෙනවා වෙනුවට, `CategorySerializer` එකම put කරලා, category object එකම (`id`, `name`, `slug`) response එකට ඇතුළත් කරනවා. මේකෙන් frontend එකට category details ගන්න separate API call එකක් කරන්න ඕන නෑ.

```python
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2)
    product_image = serializers.ImageField(source='product.image', read_only=True)
```

`source='product.xxx'` — related Product එකෙන් කෙලින්ම `name`/`price`/`image` field CartItem response එකට pull කරගන්නවා. මේකෙන් frontend එකට cart item එකක product details බලන්න වෙනම query එකක් ඕන නෑ.

```python
class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()
```

Cart එකේ items ඔක්කොම (list එකක් විදිහට, `many=True`) + computed `total` field එකත් එකට serialize කරනවා.

### Example JSON Output

```json
{
  "id": 1,
  "name": "T-Shirt",
  "price": "1500.00",
  "category": {
    "id": 2,
    "name": "Clothing",
    "slug": "clothing"
  }
}
```

---

## 4. Views (`store/views.py`) — API Logic

Views ලියලා තියෙන්නේ DRF ගේ simple `@api_view` function-based style එකෙන්. Spring Boot terms වලින් — Django views.py කියන්නේ **Controller + Service layer දෙකම එකට mix වෙච්ච** කොටසක්. Model එකෙන් Repository layer එකේ වැඩේ (`Product.objects.get()` වගේ ORM methods) handle කරනවා.

| Function | Method | Purpose |
|---|---|---|
| `get_products` | GET | Products ඔක්කොම list කරනවා |
| `get_product` | GET | Product එකක් pk එකෙන් fetch කරනවා |
| `get_categories` | GET | Categories ඔක්කොම list කරනවා |
| `get_cart` | GET | Cart එක (items + total) ගන්නවා |
| `add_to_cart` | POST | Item එකක් cart එකට add කරනවා (already තියෙනවනම් qty +1) |
| `update_cart_quantity` | POST | Cart item එකක quantity update කරනවා |
| `remove_from_cart` | POST | Item එකක් cart එකෙන් අයින් කරනවා |
| `create_order` | POST | Checkout — cart එකෙන් Order එකක් create කරනවා |

### Example — `get_cart`

```python
@api_view(['GET'])
def get_cart(request):
    cart, created = Cart.objects.get_or_create(user=None)
    serializer = CartSerializer(cart)
    return Response(serializer.data)
```

- `@api_view(['GET'])` → මේ view එකට GET request විතරයි accept වෙන්නේ
- `get_or_create(user=None)` → `user=None` කියන condition එකට match වෙන cart එකක් තියෙනවනම් ඒක return කරනවා, නැත්නම් අලුත් එකක් create කරනවා. Return වෙන්නේ `(object, boolean)` tuple එකක්
- `Response(serializer.data)` → JSON response එක, automatic ම `200 OK` status එකක් සමඟ

### Example — `create_order` (Checkout Flow)

```python
@api_view(['POST'])
def create_order(request):
    try:
        data = request.data
        name = data.get('name')
        address = data.get('address')
        phone = data.get('phone')
        payment_method = data.get('payment_method', 'COD')

        cart = Cart.objects.first()
        if not cart or not cart.items.exists():
            return Response({'error': 'Cart is empty'}, status=400)

        total = sum(float(item.product.price) * item.quantity for item in cart.items.all())
        order = Order.objects.create(user=None, total_amount=total)

        for item in cart.items.all():
            OrderItems.objects.create(
                order=order, product=item.product,
                quantity=item.quantity, price=item.product.price
            )

        cart.items.all().delete()
        return Response({'message': 'Order created successfully', 'order_id': order.id})
    except Exception as e:
        return Response({'error': str(e)}, status=500)
```

**Flow එක step-by-step:**
1. Checkout form එකෙන් `name`, `address`, `phone`, `payment_method` ගන්නවා
2. Cart එක empty නම් `400` error
3. Cart items ඔක්කොම එකතු කරලා `total` calculate කරනවා
4. `Order` record එකක් create කරනවා
5. හැම cart item එකකටම corresponding `OrderItems` record එකක් create කරනවා — **price snapshot** එකක් සමඟ (order එක place කරන instant එකේ price එක save කරගන්නවා, future එකේ product price වෙනස් උනත් order history එක accurate වෙන්න)
6. Cart clear කරනවා
7. `order_id` return කරනවා

---

## 5. API Endpoints — සම්පූර්ණ ලැයිස්තුව

**Base URL**: `/api/`

| Method | URL | Function |
|---|---|---|
| GET | `/api/product/` | `get_products` |
| GET | `/api/products/<int:pk>/` | `get_product` |
| GET | `/api/category/` | `get_categories` |
| GET | `/api/cart/` | `get_cart` |
| POST | `/api/cart/add/` | `add_to_cart` |
| POST | `/api/cart/update/` | `update_cart_quantity` |
| POST | `/api/cart/remove/` | `remove_from_cart` |
| POST | `/api/orders/create/` | `create_order` |

**Admin panel**: `/admin/` — Django built-in dashboard (Category, Product, UserProfile, Order, OrderItems models register කරලා තියෙනවා `admin.py` එකේ)

### Routing කොහොමද වැඩ කරන්නේ

```python
# backend/urls.py (root)
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('store.urls')),   # /api/ prefix එකට එන ඔක්කොම store/urls.py ට delegate
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

`/api/product/` කියලා request එකක් ආවොත් — `backend/urls.py` එකෙන් `api/` prefix එක match කරලා, ඉතුරු path එක (`product/`) `store/urls.py` එකට hand-off කරනවා. Spring Boot එකේ nested `@RequestMapping` වගේම pattern එකක්.

`static()` line එක — **dev mode විතරයි** (uploaded images serve කරන්න). Production එකේදී S3/CDN එකකින් media files serve කරන්න ඕන.

---

## 6. `settings.py` — සම්පූර්ණ Configuration Breakdown

### INSTALLED_APPS

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'store'
]
```

Django ට කියනවා මොන apps/features active ද කියලා:
- **`django.contrib.admin`** → admin dashboard (`/admin/`) enable කරනවා
- **`django.contrib.auth`** → User authentication system (login, permissions)
- **`django.contrib.contenttypes`** → Django ORM එකේ internal dependency (models generic ways වලින් reference කරන්න)
- **`django.contrib.sessions`** → Session-based data storage (cookies හරහා)
- **`django.contrib.messages`** → One-time flash messages (mostly admin/templates වලට)
- **`django.contrib.staticfiles`** → CSS/JS static files serve කරන්න
- **`rest_framework`** → DRF enable කරනවා (serializers, `@api_view`, `Response` ආදිය)
- **`store`** → ඔයාගේ app එක

⚠️ **Bug**: `corsheaders` මෙතන නෑ, ඒත් `MIDDLEWARE` එකේ use කරලා තියෙනවා — මේක fix කරන්න ඕන (පහළ බලන්න).

### MIDDLEWARE

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

Middleware කියන්නේ, request එකක් එනකොට **top-to-bottom** pass වෙන, response එකක් යනකොට **bottom-to-top** pass වෙන layers pipeline එකක්:

- **`CorsMiddleware`** → Frontend එකට (වෙනස් origin එකක - `localhost:5173`) API එකට access දෙනවා. මේක නැතුව browser එකෙන් cross-origin requests block කරනවා
- **`SecurityMiddleware`** → Security headers add කරනවා (HTTPS redirect ආදිය)
- **`SessionMiddleware`** → Session/cookie support enable කරනවා
- **`CommonMiddleware`** → Misc request normalization (URL slashes ආදිය)
- **`CsrfViewMiddleware`** → Form-based POST requests වලට CSRF attack protection
- **`AuthenticationMiddleware`** → `request.user` object එක attach කරනවා
- **`MessageMiddleware`** → Flash messages support (admin panel එකේ "Successfully saved" වගේ messages)
- **`XFrameOptionsMiddleware`** → Clickjacking protection (site එක iframe එකක load කරන එක block කරනවා)

**Practical example**: Middleware order එක important. `CorsMiddleware` හැම වෙලේම **ලිස්ට් එකේ මුලින්ම** තියෙන්න ඕන, එහෙම නැත්නම් CORS headers response එකට add වෙන්නේ අනිත් middleware ටික process වෙන්න කලින් නෙවෙයි.

### DATABASES

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}
```

**PostgreSQL** database එකකට connect වෙනවා, credentials `.env` file එකෙන් `os.getenv()` හරහා load කරගන්නවා (`python-dotenv` package එකෙන්, `load_dotenv()` call එකෙන්). Hardcode කරනවා වෙනුවට `.env` use කරන්නේ — password/credentials git එකට commit වෙන්නේ නැති වෙන්න, සහ dev/production environments වලට වෙනස් credentials easily switch කරන්න.

### CORS Configuration (⚠️ Bug එකක් තියෙනවා)

```python
CORS_ALLOW_ALL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

**Bug**: `CORS_ALLOW_ALL_ORIGINS` කියන setting එක **boolean** (`True`/`False`) විය යුතුයි ("ඕනම origin එකකට allow කරන්නද" කියලා). List එකක් දුන්නම මේක effectless වෙනවා. Correct setting name එක:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### MEDIA_URL / MEDIA_ROOT

```python
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

- **`MEDIA_ROOT`** → uploaded files actual ම save වෙන server එකේ folder path එක (`backend/media/`)
- **`MEDIA_URL`** → browser එකෙන් access කරන URL prefix එක (`http://localhost:8000/media/product/tshirt.jpg`)

Product image upload කරනකොට, `ImageField(upload_to='product/')` නිසා file එක save වෙන්නේ `media/product/` folder එකට, URL එකෙන් access කරන්නේ `/media/product/filename.jpg` කියලා.

### DEBUG සහ SECRET_KEY (⚠️ Production Warning)

```python
SECRET_KEY = 'django-insecure-2p-lfijds8^+p7q...'
DEBUG = True
ALLOWED_HOSTS = []
```

- **`DEBUG = True`** → Local development එකට විතරයි. Error pages වල full stack trace පෙන්නනවා (debugging එකට useful, ඒත් production එකේ security risk එකක් — internal code details expose වෙනවා)
- **`SECRET_KEY`** hardcoded — production එකට කලින් `.env` එකට move කරන්න ඕන
- **`ALLOWED_HOSTS = []`** → `DEBUG=True` වෙලාවේ empty list එකක් ok, production එකේදී domain names මෙතන specify කරන්න ඕන (`['yourdomain.com']`)

### DEFAULT_AUTO_FIELD

```python
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

New model එකකට automatic `id` primary key field එකක් generate කරනකොට, `BigAutoField` (64-bit integer) use කරන්න කියලා Django ට කියනවා. `AutoField` (32-bit, default පරණ Django versions වල) එකට වඩා ලොකු range එකක් තියෙනවා — records ගොඩක් accumulate වෙනකොට useful.

---

## 7. Project Architecture Pattern — MVT

Django framework එකේ architecture pattern එකට කියනවා **MVT (Model-View-Template)** කියලා — Spring Boot එකේ MVC වගේම concept එකක්:

| Spring Boot (MVC) | Django (MVT) | මේ project එකේ |
|---|---|---|
| Model | Model | `store/models.py` |
| Controller | **View** | `store/views.py` |
| View (JSP/Thymeleaf) | **Template** | ❌ නෑ (API-only) |

⚠️ Confusing point: Django එකේ "View" කියන්නේ Controller layer එකට සමානයි, HTML page එකක් නෙවෙයි.

මේ project එකේ **Template layer එකක් නෑ** — මොකද මේක pure REST API backend එකක්. UI rendering වැඩේ (Template layer එකේ job එක) දැන් කරන්නේ React frontend එකෙන් (separate project එකක්). මේකට කියනවා **decoupled architecture** කියලා — backend/frontend සම්පූර්ණයෙන්ම වෙන් project දෙකක්, JSON API එකකින් communicate වෙනවා.

```
Model → View → Serializer → JSON  (Template නෑ)
                                ↓
                    React Frontend (Vite, localhost:5173)
```

Django Admin panel එක විතරයි real MVT (Template සමඟ) use කරන එකම කොටස — ඒක Django ගේම built-in templates use කරලා render වෙනවා.

---

## 8. Frontend Connection — React එක්ක කොහොමද Connect වෙන්නේ

```
React (localhost:5173)
   │  fetch('http://localhost:8000/api/product/')
   ▼
CorsMiddleware  → cross-origin request එකට allow කරනවා
   ▼
urls.py         → routes → store.urls → views.get_products
   ▼
views.py        → Product.objects.all() query කරනවා
   ▼
serializers.py  → model objects → JSON (nested category සමඟ)
   ▼
Response(...)   → React එකට JSON return වෙනවා
   ▼
React UI එකේ render කරනවා
```

**CORS setup එකයි connection එකේ වඩාත්ම fragile කොටස** — `corsheaders` app එක `INSTALLED_APPS`-එකේ නැති නිසා, connection එක broken/unreliable වෙන්න පුළුවන්.

---

## 9. දැනට හඳුනාගත් Bugs / Issues (Fix කරන්න ඕන දේවල්)

| # | Issue | Fix |
|---|---|---|
| 1 | `corsheaders` `INSTALLED_APPS`-එකේ නෑ | `INSTALLED_APPS` ලිස්ට් එකට `'corsheaders'` add කරන්න |
| 2 | `CORS_ALLOW_ALL_ORIGINS`-ට list එකක් | `CORS_ALLOWED_ORIGINS` කියලා rename කරන්න |
| 3 | Cart එකට real user isolation නෑ | `user=None` වෙනුවට `request.user`/session-based cart |
| 4 | `SECRET_KEY` hardcoded, `DEBUG=True` | Production වලට කලින් `.env`+`DEBUG=False` |
| 5 | Checkout එකේදී `name`/`address`/`phone` capture කරනවා ඇත්ත, save වෙන්නේ නෑ | `Order` model එකට මේ fields add කරන්න |
| 6 | `Cart.objects.first()` — hardcoded පලවෙනි cart එකම pick කරගන්නවා | Real cart identification logic (user/session based) |
| 7 | `create_order` එකේදී `total` manually recalculate කරනවා (Model එකේ `@property` එකම නෑ use කරන්නේ) | `cart.total` කෙලින්ම use කරන්න |
| 8 | `update_cart_quantity` — item delete කරලා, ඒත් "error" status එකක් return කරනවා | `status=200` + success message දෙන්න |
| 9 | Broad `except Exception` — internal errors client එකට expose වෙනවා | Specific exception handling |

---

## 10. Quick Reference — Key Files

| File | වගකීම |
|---|---|
| `models.py` | Database schema (Category, Product, Cart, Order...) |
| `serializers.py` | Model ↔ JSON conversion |
| `views.py` | API endpoints එකේ actual logic |
| `store/urls.py` | `/api/` යටතේ routes |
| `backend/urls.py` | Root routing (`/admin/`, `/api/`) |
| `settings.py` | Apps, Middleware, DB, CORS, Media config |
| `admin.py` | Admin panel එකට models register කිරීම |