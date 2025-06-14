PGDMP      '                }            postgres    17.5    17.5 ?    }           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            ~           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false                       0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            �           1262    5    postgres    DATABASE     �   CREATE DATABASE postgres WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'Chinese (Traditional)_Taiwan.932';
    DROP DATABASE postgres;
                     postgres    false            �           0    0    DATABASE postgres    COMMENT     N   COMMENT ON DATABASE postgres IS 'default administrative connection database';
                        postgres    false    4992            �            1259    16403    articles    TABLE     y  CREATE TABLE public.articles (
    id integer NOT NULL,
    title character varying(32) NOT NULL,
    alltext text NOT NULL,
    summary text,
    datecreated timestamp without time zone DEFAULT now() NOT NULL,
    datemodified timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    imageurl character varying(2048),
    published boolean,
    authorid integer
);
    DROP TABLE public.articles;
       public         heap r       postgres    false            �            1259    16402    articles_id_seq    SEQUENCE     �   CREATE SEQUENCE public.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.articles_id_seq;
       public               postgres    false    220            �           0    0    articles_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;
          public               postgres    false    219            �            1259    16528 	   countries    TABLE     l   CREATE TABLE public.countries (
    code character(2) NOT NULL,
    name character varying(255) NOT NULL
);
    DROP TABLE public.countries;
       public         heap r       postgres    false            �            1259    16424    hotel_images    TABLE     }   CREATE TABLE public.hotel_images (
    id integer NOT NULL,
    hotel_code integer NOT NULL,
    image_path text NOT NULL
);
     DROP TABLE public.hotel_images;
       public         heap r       postgres    false            �            1259    16423    hotel_images_id_seq    SEQUENCE     �   CREATE SEQUENCE public.hotel_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public.hotel_images_id_seq;
       public               postgres    false    223            �           0    0    hotel_images_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public.hotel_images_id_seq OWNED BY public.hotel_images.id;
          public               postgres    false    222            �            1259    16454    hotel_room_rates    TABLE     �  CREATE TABLE public.hotel_room_rates (
    id integer NOT NULL,
    hotel_room_id integer NOT NULL,
    rate_key character varying(255) NOT NULL,
    rate_class character varying(50),
    rate_type character varying(50),
    net numeric NOT NULL,
    selling_rate numeric,
    hotel_mandatory boolean,
    adults integer,
    children integer,
    rooms_in_rate integer,
    board_name character varying(255)
);
 $   DROP TABLE public.hotel_room_rates;
       public         heap r       postgres    false            �            1259    16453    hotel_room_rates_id_seq    SEQUENCE     �   CREATE SEQUENCE public.hotel_room_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public.hotel_room_rates_id_seq;
       public               postgres    false    227            �           0    0    hotel_room_rates_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public.hotel_room_rates_id_seq OWNED BY public.hotel_room_rates.id;
          public               postgres    false    226            �            1259    16438    hotel_rooms    TABLE     �   CREATE TABLE public.hotel_rooms (
    id integer NOT NULL,
    hotel_code integer NOT NULL,
    room_code character varying(255) NOT NULL,
    name character varying(255)
);
    DROP TABLE public.hotel_rooms;
       public         heap r       postgres    false            �            1259    16437    hotel_rooms_id_seq    SEQUENCE     �   CREATE SEQUENCE public.hotel_rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.hotel_rooms_id_seq;
       public               postgres    false    225            �           0    0    hotel_rooms_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.hotel_rooms_id_seq OWNED BY public.hotel_rooms.id;
          public               postgres    false    224            �            1259    16415    hotels    TABLE     �  CREATE TABLE public.hotels (
    code integer NOT NULL,
    name character varying(255) NOT NULL,
    category_name character varying(255),
    destination_name character varying(255),
    zone_name character varying(255),
    currency character varying(10),
    min_rate numeric,
    max_rate numeric,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    available_rooms integer DEFAULT 0,
    country_code character(2)
);
    DROP TABLE public.hotels;
       public         heap r       postgres    false            �            1259    16482    message_threads    TABLE     �  CREATE TABLE public.message_threads (
    id integer NOT NULL,
    user_id integer NOT NULL,
    subject character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_message_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying NOT NULL,
    last_message_preview text,
    is_read_by_user boolean DEFAULT true NOT NULL,
    is_read_by_admin boolean DEFAULT false NOT NULL
);
 #   DROP TABLE public.message_threads;
       public         heap r       postgres    false            �            1259    16481    message_threads_id_seq    SEQUENCE     �   CREATE SEQUENCE public.message_threads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.message_threads_id_seq;
       public               postgres    false    229            �           0    0    message_threads_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.message_threads_id_seq OWNED BY public.message_threads.id;
          public               postgres    false    228            �            1259    16504    thread_messages    TABLE       CREATE TABLE public.thread_messages (
    id integer NOT NULL,
    thread_id integer NOT NULL,
    sender_id integer NOT NULL,
    sender_username character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 #   DROP TABLE public.thread_messages;
       public         heap r       postgres    false            �            1259    16503    thread_messages_id_seq    SEQUENCE     �   CREATE SEQUENCE public.thread_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 -   DROP SEQUENCE public.thread_messages_id_seq;
       public               postgres    false    231            �           0    0    thread_messages_id_seq    SEQUENCE OWNED BY     Q   ALTER SEQUENCE public.thread_messages_id_seq OWNED BY public.thread_messages.id;
          public               postgres    false    230            �            1259    16389    users    TABLE     �  CREATE TABLE public.users (
    id integer NOT NULL,
    firstname character varying(32),
    lastname character varying(32),
    username character varying(16) NOT NULL,
    about text,
    dateregistered timestamp without time zone DEFAULT now() NOT NULL,
    password character varying(32),
    passwordsalt character varying(16),
    email character varying(64) NOT NULL,
    avatarurl character varying(64),
    roles character varying(50) DEFAULT 'normal_user'::character varying NOT NULL,
    favourite_hotels integer[],
    CONSTRAINT chk_role CHECK (((roles)::text = ANY ((ARRAY['admin'::character varying, 'normal_user'::character varying])::text[])))
);
    DROP TABLE public.users;
       public         heap r       postgres    false            �            1259    16388    users_id_seq    SEQUENCE     �   CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.users_id_seq;
       public               postgres    false    218            �           0    0    users_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
          public               postgres    false    217            �           2604    16406    articles id    DEFAULT     j   ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);
 :   ALTER TABLE public.articles ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    220    219    220            �           2604    16427    hotel_images id    DEFAULT     r   ALTER TABLE ONLY public.hotel_images ALTER COLUMN id SET DEFAULT nextval('public.hotel_images_id_seq'::regclass);
 >   ALTER TABLE public.hotel_images ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    223    222    223            �           2604    16457    hotel_room_rates id    DEFAULT     z   ALTER TABLE ONLY public.hotel_room_rates ALTER COLUMN id SET DEFAULT nextval('public.hotel_room_rates_id_seq'::regclass);
 B   ALTER TABLE public.hotel_room_rates ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    227    226    227            �           2604    16441    hotel_rooms id    DEFAULT     p   ALTER TABLE ONLY public.hotel_rooms ALTER COLUMN id SET DEFAULT nextval('public.hotel_rooms_id_seq'::regclass);
 =   ALTER TABLE public.hotel_rooms ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    225    224    225            �           2604    16485    message_threads id    DEFAULT     x   ALTER TABLE ONLY public.message_threads ALTER COLUMN id SET DEFAULT nextval('public.message_threads_id_seq'::regclass);
 A   ALTER TABLE public.message_threads ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    228    229    229            �           2604    16507    thread_messages id    DEFAULT     x   ALTER TABLE ONLY public.thread_messages ALTER COLUMN id SET DEFAULT nextval('public.thread_messages_id_seq'::regclass);
 A   ALTER TABLE public.thread_messages ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    230    231    231            �           2604    16392    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    218    217    218            �           2606    16412    articles articles_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.articles DROP CONSTRAINT articles_pkey;
       public                 postgres    false    220            �           2606    16533    countries countries_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (code);
 B   ALTER TABLE ONLY public.countries DROP CONSTRAINT countries_pkey;
       public                 postgres    false    232            �           2606    16431    hotel_images hotel_images_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.hotel_images
    ADD CONSTRAINT hotel_images_pkey PRIMARY KEY (id);
 H   ALTER TABLE ONLY public.hotel_images DROP CONSTRAINT hotel_images_pkey;
       public                 postgres    false    223            �           2606    16461 &   hotel_room_rates hotel_room_rates_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public.hotel_room_rates
    ADD CONSTRAINT hotel_room_rates_pkey PRIMARY KEY (id);
 P   ALTER TABLE ONLY public.hotel_room_rates DROP CONSTRAINT hotel_room_rates_pkey;
       public                 postgres    false    227            �           2606    16463 .   hotel_room_rates hotel_room_rates_rate_key_key 
   CONSTRAINT     m   ALTER TABLE ONLY public.hotel_room_rates
    ADD CONSTRAINT hotel_room_rates_rate_key_key UNIQUE (rate_key);
 X   ALTER TABLE ONLY public.hotel_room_rates DROP CONSTRAINT hotel_room_rates_rate_key_key;
       public                 postgres    false    227            �           2606    16447 0   hotel_rooms hotel_rooms_hotel_code_room_code_key 
   CONSTRAINT     |   ALTER TABLE ONLY public.hotel_rooms
    ADD CONSTRAINT hotel_rooms_hotel_code_room_code_key UNIQUE (hotel_code, room_code);
 Z   ALTER TABLE ONLY public.hotel_rooms DROP CONSTRAINT hotel_rooms_hotel_code_room_code_key;
       public                 postgres    false    225    225            �           2606    16445    hotel_rooms hotel_rooms_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.hotel_rooms
    ADD CONSTRAINT hotel_rooms_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.hotel_rooms DROP CONSTRAINT hotel_rooms_pkey;
       public                 postgres    false    225            �           2606    16422    hotels hotels_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (code);
 <   ALTER TABLE ONLY public.hotels DROP CONSTRAINT hotels_pkey;
       public                 postgres    false    221            �           2606    16494 $   message_threads message_threads_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_pkey PRIMARY KEY (id);
 N   ALTER TABLE ONLY public.message_threads DROP CONSTRAINT message_threads_pkey;
       public                 postgres    false    229            �           2606    16512 $   thread_messages thread_messages_pkey 
   CONSTRAINT     b   ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_pkey PRIMARY KEY (id);
 N   ALTER TABLE ONLY public.thread_messages DROP CONSTRAINT thread_messages_pkey;
       public                 postgres    false    231            �           2606    16477    hotel_images unique_hotel_image 
   CONSTRAINT     l   ALTER TABLE ONLY public.hotel_images
    ADD CONSTRAINT unique_hotel_image UNIQUE (hotel_code, image_path);
 I   ALTER TABLE ONLY public.hotel_images DROP CONSTRAINT unique_hotel_image;
       public                 postgres    false    223    223            �           2606    16399    users users_email_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
 ?   ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
       public                 postgres    false    218            �           2606    16397    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public                 postgres    false    218            �           2606    16401    users users_username_key 
   CONSTRAINT     W   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);
 B   ALTER TABLE ONLY public.users DROP CONSTRAINT users_username_key;
       public                 postgres    false    218            �           1259    16534    idx_countries_code    INDEX     H   CREATE INDEX idx_countries_code ON public.countries USING btree (code);
 &   DROP INDEX public.idx_countries_code;
       public                 postgres    false    232            �           1259    16535    idx_countries_name    INDEX     H   CREATE INDEX idx_countries_name ON public.countries USING btree (name);
 &   DROP INDEX public.idx_countries_name;
       public                 postgres    false    232            �           1259    16501 #   idx_message_threads_last_message_at    INDEX     o   CREATE INDEX idx_message_threads_last_message_at ON public.message_threads USING btree (last_message_at DESC);
 7   DROP INDEX public.idx_message_threads_last_message_at;
       public                 postgres    false    229            �           1259    16502    idx_message_threads_status    INDEX     X   CREATE INDEX idx_message_threads_status ON public.message_threads USING btree (status);
 .   DROP INDEX public.idx_message_threads_status;
       public                 postgres    false    229            �           1259    16500    idx_message_threads_user_id    INDEX     Z   CREATE INDEX idx_message_threads_user_id ON public.message_threads USING btree (user_id);
 /   DROP INDEX public.idx_message_threads_user_id;
       public                 postgres    false    229            �           1259    16524    idx_thread_messages_sender_id    INDEX     ^   CREATE INDEX idx_thread_messages_sender_id ON public.thread_messages USING btree (sender_id);
 1   DROP INDEX public.idx_thread_messages_sender_id;
       public                 postgres    false    231            �           1259    16523 (   idx_thread_messages_thread_id_created_at    INDEX     u   CREATE INDEX idx_thread_messages_thread_id_created_at ON public.thread_messages USING btree (thread_id, created_at);
 <   DROP INDEX public.idx_thread_messages_thread_id_created_at;
       public                 postgres    false    231    231            �           2606    16432 )   hotel_images hotel_images_hotel_code_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.hotel_images
    ADD CONSTRAINT hotel_images_hotel_code_fkey FOREIGN KEY (hotel_code) REFERENCES public.hotels(code) ON DELETE CASCADE;
 S   ALTER TABLE ONLY public.hotel_images DROP CONSTRAINT hotel_images_hotel_code_fkey;
       public               postgres    false    221    223    4809            �           2606    16464 4   hotel_room_rates hotel_room_rates_hotel_room_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.hotel_room_rates
    ADD CONSTRAINT hotel_room_rates_hotel_room_id_fkey FOREIGN KEY (hotel_room_id) REFERENCES public.hotel_rooms(id) ON DELETE CASCADE;
 ^   ALTER TABLE ONLY public.hotel_room_rates DROP CONSTRAINT hotel_room_rates_hotel_room_id_fkey;
       public               postgres    false    225    227    4817            �           2606    16448 '   hotel_rooms hotel_rooms_hotel_code_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.hotel_rooms
    ADD CONSTRAINT hotel_rooms_hotel_code_fkey FOREIGN KEY (hotel_code) REFERENCES public.hotels(code) ON DELETE CASCADE;
 Q   ALTER TABLE ONLY public.hotel_rooms DROP CONSTRAINT hotel_rooms_hotel_code_fkey;
       public               postgres    false    221    4809    225            �           2606    16536    hotels hotels_country_code_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_country_code_fkey FOREIGN KEY (country_code) REFERENCES public.countries(code) ON UPDATE CASCADE ON DELETE SET NULL;
 I   ALTER TABLE ONLY public.hotels DROP CONSTRAINT hotels_country_code_fkey;
       public               postgres    false    4832    232    221            �           2606    16495 ,   message_threads message_threads_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.message_threads
    ADD CONSTRAINT message_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 V   ALTER TABLE ONLY public.message_threads DROP CONSTRAINT message_threads_user_id_fkey;
       public               postgres    false    229    4803    218            �           2606    16518 .   thread_messages thread_messages_sender_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;
 X   ALTER TABLE ONLY public.thread_messages DROP CONSTRAINT thread_messages_sender_id_fkey;
       public               postgres    false    4803    218    231            �           2606    16513 .   thread_messages thread_messages_thread_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.thread_messages
    ADD CONSTRAINT thread_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id) ON DELETE CASCADE;
 X   ALTER TABLE ONLY public.thread_messages DROP CONSTRAINT thread_messages_thread_id_fkey;
       public               postgres    false    229    231    4826           